import { app } from "electron";
import { installApplicationBranding } from "./app/application-branding.ts";
import { installApplicationMenu } from "./app/application-menu.ts";
import { DesktopRuntime } from "./runtime/desktop-runtime.ts";

// Electron 入口只负责全局安装与生命周期接线；具体职责拆分到 app / runtime / guards / resources 等模块中。
installApplicationBranding(app);
installApplicationMenu(app);

const runtime = new DesktopRuntime(app);

app.whenReady().then(() => runtime.createMainWindow());

app.on("window-all-closed", () => {
	// AzurAuto 是任务型桌面工具：关闭最后一个窗口即彻底退出，不保留 macOS Dock 后台实例。
	app.quit();
});

app.on("before-quit", (event) => {
	runtime.handleBeforeQuit(event);
});
