import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "electron";

const __dirname = dirname(fileURLToPath(import.meta.url));

export type AndroidResources = {
	root: string;
	adbPath?: string;
	scrcpyServerPath?: string;
	atxApkPath?: string;
	uiautomator2JarPath?: string;
};

/**
 * Android native 资源解析器。
 * 开发模式读取 apps/desktop/resources/android；打包后读取 process.resourcesPath/android。
 */
export function resolveAndroidResources(): AndroidResources {
	const root = app.isPackaged
		? join(process.resourcesPath, "android")
		: join(__dirname, "..", "..", "resources", "android");

	const adbPath = join(
		root,
		"platform-tools",
		process.platform,
		process.platform === "win32" ? "adb.exe" : "adb",
	);
	const scrcpyServerPath = join(root, "scrcpy-server.bin");
	const atxApkPath = join(root, "atx-agent.apk");
	const uiautomator2JarPath = join(root, "u2.jar");

	return {
		root,
		adbPath: existsSync(adbPath) ? adbPath : undefined,
		scrcpyServerPath: existsSync(scrcpyServerPath)
			? scrcpyServerPath
			: undefined,
		atxApkPath: existsSync(atxApkPath) ? atxApkPath : undefined,
		uiautomator2JarPath: existsSync(uiautomator2JarPath)
			? uiautomator2JarPath
			: undefined,
	};
}
