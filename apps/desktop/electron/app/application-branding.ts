import type { App } from "electron";
import { APP_ID, APP_NAME } from "../config/app-config.ts";

// 应用品牌与系统集成设置：名称、About 面板、Windows AppUserModelID。
// macOS dev 的 Dock hover 名称仍由 Electron.app bundle 决定，运行时只能影响菜单/关于面板等展示。

export function installApplicationBranding(electronApp: App) {
	electronApp.setName(APP_NAME);
	electronApp.setAboutPanelOptions({ applicationName: APP_NAME });

	if (process.platform === "win32") {
		electronApp.setAppUserModelId(APP_ID);
	}
}
