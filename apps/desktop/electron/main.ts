import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DeviceBootstrapService } from "@azurauto/automation";
import { app, BrowserWindow } from "electron";
import { registerIpcHandlers } from "./ipc/handlers.ts";
import { RendererServerManager } from "./utils/renderer-server.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

let mainWindow: Electron.BrowserWindow | null = null;
const rendererServer = new RendererServerManager(app);
const bootstrapService = new DeviceBootstrapService({
	onStatusChange(status) {
		console.log("Environment bootstrap status:", status);
	},
});

// Register IPC before the renderer loads so preload calls always have handlers.
// 在渲染进程加载前注册 IPC，确保 preload 调用时主进程 handler 已经存在。
registerIpcHandlers(bootstrapService);

/**
 * Create the main application window and load the renderer URL.
 * 创建主窗口并加载渲染进程 URL。
 */
async function createMainWindow() {
	console.log("Electron app ready. Creating window...");

	// 环境检查异步启动，避免 ADB/ATX 安装耗时阻塞主窗口展示。
	void bootstrapService.run();

	const rendererUrl = await rendererServer.getRendererUrl();

	mainWindow = new BrowserWindow({
		width: 1280,
		height: 720,
		webPreferences: {
			// Preload runs as a CommonJS sandbox script in packaged Electron apps.
			// 打包后的 preload 会作为 CommonJS 沙箱脚本执行，不能直接加载 ESM/TS import。
			preload: join(__dirname, "preload/index.cjs"),
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
