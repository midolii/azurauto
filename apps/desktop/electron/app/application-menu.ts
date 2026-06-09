import { Menu, type App, type MenuItemConstructorOptions } from "electron";
import { APP_NAME } from "../config/app-config.ts";

// 应用菜单构建：macOS 提供 About/Quit，开发态额外保留 View 调试菜单。
// 打包态仍沿用受限菜单，避免用户通过菜单触发刷新或 DevTools。

export function installApplicationMenu(electronApp: App) {
	if (electronApp.isPackaged || process.platform === "darwin") {
		Menu.setApplicationMenu(createApplicationMenu(electronApp));
	}
}

function createApplicationMenu(electronApp: App) {
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
		...(!electronApp.isPackaged
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
