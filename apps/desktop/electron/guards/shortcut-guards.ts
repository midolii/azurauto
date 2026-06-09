import type { BrowserWindow, Input } from "electron";

// 打包后快捷键守卫：阻止刷新、查找和 DevTools 快捷键。
// dev 环境不注册，保留调试效率。

export function registerBlockedShortcuts(window: BrowserWindow) {
	window.webContents.on("before-input-event", (event, input) => {
		if (isBlockedShortcut(input)) {
			event.preventDefault();
		}
	});
}

function isBlockedShortcut(input: Input) {
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
