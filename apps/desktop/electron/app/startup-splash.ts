import { readFileSync } from "node:fs";
import { getElectronTemplatePath } from "../config/paths.ts";

// 启动页 data URL 生成器：主窗口先加载静态 splash，再切换到真实 renderer。
// 这样 renderer server 启动期间用户不会看到空白窗口。

export function createStartupSplashUrl() {
	const html = readFileSync(
		getElectronTemplatePath("startup-splash.html"),
		"utf8",
	);

	return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}
