import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AdbClient } from "@azurauto/adb";
import {
	type AutomationLogEntry,
	Uiautomator2ScreenshotSource,
	createDefaultAtxInstallStrategy,
	setAutomationLogger,
} from "@azurauto/automation";
import { DeviceBootstrapService } from "@azurauto/automation";
import {
	app,
	BrowserWindow,
	Menu,
	nativeImage,
	type MenuItemConstructorOptions,
} from "electron";
import { cleanupIpcResources, registerIpcHandlers } from "./ipc/handlers/index.ts";
import { ResourcePreparationService } from "./utils/resource-preparation.ts";
import { resolveAndroidResources } from "./utils/android-resources.ts";
import { RendererServerManager } from "./utils/renderer-server.ts";
import { logEntry } from "./utils/global-logger.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_NAME = "azurauto";
const APP_ID = "net.midolii.azurauto";
const AZURAUTO_ADB_SERVER_PORT = Number(
	process.env.AZURAUTO_ADB_SERVER_PORT ?? 15_037,
);

app.setName(APP_NAME);
app.setAboutPanelOptions({
	applicationName: APP_NAME,
});

if (app.isPackaged || process.platform === "darwin") {
	Menu.setApplicationMenu(createApplicationMenu());
}
if (process.platform === "win32") {
	app.setAppUserModelId(APP_ID);
}

let mainWindow: Electron.BrowserWindow | null = null;
const rendererServer = new RendererServerManager(app);
let bootstrapService: DeviceBootstrapService;
let isRunningQuitCleanup = false;

/**
 * Create the main application window and load the renderer URL.
 * 创建主窗口并加载渲染进程 URL。
 */
async function createMainWindow() {
	console.log("Electron app ready. Creating window...");
	setAutomationLogger((entry: AutomationLogEntry) => logEntry(entry));
	const resources = resolveAndroidResources();
	console.log("Resolved Android resources:", resources);
	const resourcePreparationService = new ResourcePreparationService(resources);
	const adb = new AdbClient({
		bin: resources.adbPath,
		port: AZURAUTO_ADB_SERVER_PORT,
	});
	bootstrapService = new DeviceBootstrapService({
		adb,
		atx: createDefaultAtxInstallStrategy(resources.atxApkPath),
		screenshotSource: new Uiautomator2ScreenshotSource(adb, {
			jarPath: resources.uiautomator2JarPath,
		}),
		onStatusChange(status) {
			console.log("Environment bootstrap status:", status);
		},
	});

	// Register IPC before the renderer loads so preload calls always have handlers.
	// 在渲染进程加载前注册 IPC，确保 preload 调用时主进程 handler 已经存在。
	registerIpcHandlers(bootstrapService, resourcePreparationService, resources);

	// 启动阶段仍不做完整设备 bootstrap：不检查 ATX、不启动 uiautomator、不开始截图。
	// 资源 ready 后只后台预热一次 ADB 设备枚举，降低用户点击 Start 时的冷 listDevices 耗时。
	void resourcePreparationService.prepare().then((status) => {
		if (status.ready) {
			void prewarmAdbDeviceList(adb);
		}
	});
	const windowIcon = createWindowIcon();
	const dockIcon = createDevDockIcon();
	if (process.platform === "darwin" && !dockIcon.isEmpty()) {
		app.dock?.setIcon(dockIcon);
	}

	mainWindow = new BrowserWindow({
		title: APP_NAME,
		width: 1280,
		height: 720,
		minWidth: 1024,
		minHeight: 640,
		backgroundColor: "#f8fbff",
		icon: windowIcon.isEmpty() ? undefined : windowIcon,
		webPreferences: {
			// Electron 加载的是 preload TS 源码打包后的 CommonJS 产物。
			preload: join(__dirname, "preload/dist/index.cjs"),
			contextIsolation: true,
		},
	});

	mainWindow.once("ready-to-show", () => {
		mainWindow?.show();
		mainWindow?.focus();
	});

	mainWindow.on("closed", () => {
		mainWindow = null;
	});


	if (app.isPackaged) {
		registerBlockedShortcuts(mainWindow);
	}

	await mainWindow.loadURL(createStartupSplashUrl());
	const rendererUrl = await rendererServer.getRendererUrl();

	mainWindow.loadURL(rendererUrl).catch((error) => {
		console.error("Failed to load renderer:", error);
	});
}

function createWindowIcon() {
	return createPublicIcon("icon.png");
}

function createDevDockIcon() {
	if (app.isPackaged) {
		return nativeImage.createEmpty();
	}

	const icon = createPublicIcon("icon-dev.png");

	return icon.isEmpty() ? createWindowIcon() : icon;
}

function createPublicIcon(fileName: string) {
	const iconPath = join(__dirname, "..", "public", fileName);

	return existsSync(iconPath)
		? nativeImage.createFromPath(iconPath)
		: nativeImage.createEmpty();
}

async function prewarmAdbDeviceList(adb: AdbClient) {
	const startedAt = Date.now();
	try {
		const devices = await adb.listDevices();
		logEntry({
			level: "debug",
			scope: "startup.adb.prewarmListDevices",
			message: `prewarmed ADB device list (${devices.length} device${devices.length === 1 ? "" : "s"})`,
			durationMs: Date.now() - startedAt,
		});
	} catch (error) {
		logEntry({
			level: "warn",
			scope: "startup.adb.prewarmListDevices",
			message:
				error instanceof Error
					? error.message
					: "ADB device list prewarm failed.",
			durationMs: Date.now() - startedAt,
		});
	}
}

function registerBlockedShortcuts(window: Electron.BrowserWindow) {
	window.webContents.on("before-input-event", (event, input) => {
		if (isBlockedShortcut(input)) {
			event.preventDefault();
		}
	});
}

function isBlockedShortcut(input: Electron.Input) {
	const key = input.key.toLowerCase();
	const hasCommandModifier = input.control || input.meta;
	const isDevToolsShortcut =
		key === "f12" ||
		(hasCommandModifier && input.shift && (key === "i" || key === "j"));

	return (
		key === "f5" ||
		(hasCommandModifier && key === "r") ||
		(hasCommandModifier && key === "f") ||
		isDevToolsShortcut
	);
}

function createApplicationMenu() {
	const template: MenuItemConstructorOptions[] = [
		...(process.platform === "darwin"
			? [
					{
						label: APP_NAME,
						submenu: [
							{ role: "about" as const, label: `About ${APP_NAME}` },
							{ type: "separator" as const },
							{ role: "quit" as const, label: `Quit ${APP_NAME}` },
						],
					},
				]
			: []),
		{
			label: "Edit",
			submenu: [
				{ role: "undo" },
				{ role: "redo" },
				{ type: "separator" },
				{ role: "cut" },
				{ role: "copy" },
				{ role: "paste" },
				{ role: "selectAll" },
			],
		},
		...(!app.isPackaged
			? [
					{
						label: "View",
						submenu: [
							{ role: "reload" as const },
							{ role: "forceReload" as const },
							{ type: "separator" as const },
							{ role: "toggleDevTools" as const },
						],
					},
				]
			: []),
	];

	return Menu.buildFromTemplate(template);
}

function createStartupSplashUrl() {
	const html = readFileSync(
		join(__dirname, "template", "startup-splash.html"),
		"utf8",
	);

	return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

app.whenReady().then(createMainWindow);

app.on("window-all-closed", () => {
	// AzurAuto 是任务型桌面工具：关闭最后一个窗口即彻底退出，不保留 macOS Dock 后台实例。
	app.quit();
});

app.on("before-quit", (event) => {
	if (isRunningQuitCleanup) {
		return;
	}

	event.preventDefault();
	isRunningQuitCleanup = true;

	void shutdownNativeResources().finally(() => {
		app.quit();
	});
});

async function shutdownNativeResources() {
	// 退出状态转换：先停设备/预览资源，再停 AzurAuto 专用 ADB server 和内置 renderer server，避免残留后台句柄。
	await cleanupIpcResources();
	await bootstrapService?.shutdown();
	rendererServer.stop();
}
