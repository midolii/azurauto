import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AdbClient } from "@azurauto/adb";
import {
 	Uiautomator2ScreenshotSource,
 	createDefaultAtxInstallStrategy,
} from "@azurauto/automation";
import { DeviceBootstrapService } from "@azurauto/automation";
import { app, BrowserWindow } from "electron";
import { registerIpcHandlers } from "./ipc/handlers.ts";
import { resolveAndroidResources } from "./utils/android-resources.ts";
import { RendererServerManager } from "./utils/renderer-server.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

let mainWindow: Electron.BrowserWindow | null = null;
const rendererServer = new RendererServerManager(app);
let bootstrapService: DeviceBootstrapService;

/**
 * Create the main application window and load the renderer URL.
 * 创建主窗口并加载渲染进程 URL。
 */
async function createMainWindow() {
	console.log("Electron app ready. Creating window...");
	const resources = resolveAndroidResources();
	const adb = new AdbClient({ bin: resources.adbPath });
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
	registerIpcHandlers(bootstrapService, resources);

	// 环境检查异步启动，避免 ADB/ATX 安装耗时阻塞主窗口展示。
	void bootstrapService.run();

	const rendererUrl = await rendererServer.getRendererUrl();

	mainWindow = new BrowserWindow({
		width: 1280,
		height: 720,
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

	mainWindow.loadURL(rendererUrl).catch((error) => {
		console.error("Failed to load renderer:", error);
	});
}

app.whenReady().then(createMainWindow);

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("before-quit", () => {
	rendererServer.stop();
});
