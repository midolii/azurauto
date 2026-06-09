import { BrowserWindow, type App, type Event } from "electron";
import { cleanupIpcResources, registerIpcHandlers } from "../ipc/handlers/index.ts";
import { resolveAndroidResources } from "../resources/android-resources.ts";
import { ResourcePreparationService } from "../resources/resource-preparation.ts";
import { prewarmAdbDeviceList } from "./adb-prewarm.ts";
import {
	type AutomationServices,
	createAutomationServices,
} from "./automation-services.ts";
import { applyDevelopmentDockIcon, createWindowIcon } from "../app/app-icons.ts";
import { APP_NAME, AZURAUTO_ADB_SERVER_PORT } from "../config/app-config.ts";
import { getPreloadDistPath } from "../config/paths.ts";
import { registerBlockedShortcuts } from "../guards/shortcut-guards.ts";
import { createStartupSplashUrl } from "../app/startup-splash.ts";
import { RendererServerManager } from "./renderer-server.ts";

// 桌面运行时：管理主窗口、renderer server、自动化服务和退出清理状态。
// main.ts 只调用这个类，不直接持有窗口或 native 资源。

export class DesktopRuntime {
	#bootstrapService?: AutomationServices["bootstrapService"];
	#isRunningQuitCleanup = false;
	#mainWindow: BrowserWindow | null = null;
	#rendererServer: RendererServerManager;
	readonly #app: App;

	constructor(electronApp: App) {
		this.#app = electronApp;
		this.#rendererServer = new RendererServerManager(electronApp);
	}

	/**
	 * 创建主窗口并加载 renderer。
	 * IPC 和 native 服务必须先于 renderer 加载完成注册，避免 preload 首次调用时没有 handler。
	 */
	async createMainWindow() {
		console.log("Electron app ready. Creating window...");

		const resources = resolveAndroidResources();
		console.log("Resolved Android resources:", resources);

		const resourcePreparationService = new ResourcePreparationService(resources);
		const { adb, bootstrapService } = createAutomationServices(
			resources,
			AZURAUTO_ADB_SERVER_PORT,
		);
		this.#bootstrapService = bootstrapService;

		registerIpcHandlers(bootstrapService, resourcePreparationService, resources);
		this.#prepareResourcesInBackground(resourcePreparationService, adb);

		const window = this.#createBrowserWindow();
		this.#mainWindow = window;
		this.#wireWindowLifecycle(window);

		if (this.#app.isPackaged) {
			registerBlockedShortcuts(window);
		}

		await window.loadURL(createStartupSplashUrl());
		const rendererUrl = await this.#rendererServer.getRendererUrl();

		window.loadURL(rendererUrl).catch((error) => {
			console.error("Failed to load renderer:", error);
		});
	}

	/**
	 * before-quit 中先拦截一次默认退出，等 native 资源清理完再真正 app.quit()。
	 */
	handleBeforeQuit(event: Event) {
		if (this.#isRunningQuitCleanup) {
			return;
		}

		event.preventDefault();
		this.#isRunningQuitCleanup = true;

		void this.#shutdownNativeResources().finally(() => {
			this.#app.quit();
		});
	}

	#createBrowserWindow() {
		const windowIcon = createWindowIcon();
		applyDevelopmentDockIcon(this.#app);

		return new BrowserWindow({
			title: APP_NAME,
			width: 1280,
			height: 720,
			minWidth: 1024,
			minHeight: 640,
			backgroundColor: "#f8fbff",
			icon: windowIcon.isEmpty() ? undefined : windowIcon,
			webPreferences: {
				// preload TS 会先构建为 CommonJS，再由 Electron 主进程加载。
				preload: getPreloadDistPath("index.cjs"),
				contextIsolation: true,
			},
		});
	}

	#wireWindowLifecycle(window: BrowserWindow) {
		window.once("ready-to-show", () => {
			window.show();
			window.focus();
		});

		window.on("closed", () => {
			if (this.#mainWindow === window) {
				this.#mainWindow = null;
			}
		});
	}

	#prepareResourcesInBackground(
		resourcePreparationService: ResourcePreparationService,
		adb: AutomationServices["adb"],
	) {
		// 启动阶段仍不做完整设备 bootstrap：不检查 ATX、不启动 uiautomator、不开始截图。
		// 资源 ready 后只后台预热一次 ADB 设备枚举，降低用户点击 Start 时的等待。
		void resourcePreparationService.prepare().then((status) => {
			if (status.ready) {
				void prewarmAdbDeviceList(adb);
			}
		});
	}

	async #shutdownNativeResources() {
		// 退出状态转换：先停设备/预览资源，再停 AzurAuto 专用 ADB server 和内置 renderer server。
		await cleanupIpcResources();
		await this.#bootstrapService?.shutdown();
		this.#rendererServer.stop();
	}
}
