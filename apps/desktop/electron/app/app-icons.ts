import { existsSync } from "node:fs";
import { nativeImage, type App } from "electron";
import { getElectronPublicPath } from "../config/paths.ts";

// 图标加载与 macOS dev Dock 图标逻辑。仅使用 public/icon-dev.png / public/icon.png。
// dev Dock 通过 app.dock.setIcon 动态替换 PNG，显示会比打包后的 .icns 更贴边，故优先使用带 padding 的 icon-dev.png。

export function createWindowIcon() {
	return createPublicIcon("icon.png");
}

export function applyDevelopmentDockIcon(electronApp: App) {
	const dockIcon = createDevDockIcon(electronApp);

	if (process.platform === "darwin" && !dockIcon.isEmpty()) {
		electronApp.dock?.setIcon(dockIcon);
	}
}

function createDevDockIcon(electronApp: App) {
	if (electronApp.isPackaged) {
		return nativeImage.createEmpty();
	}

	const icon = createPublicIcon("icon-dev.png");

	return icon.isEmpty() ? createWindowIcon() : icon;
}

function createPublicIcon(fileName: string) {
	const iconPath = getElectronPublicPath(fileName);

	return existsSync(iconPath)
		? nativeImage.createFromPath(iconPath)
		: nativeImage.createEmpty();
}
