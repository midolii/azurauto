import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Electron 路径助手：集中处理 public、template、preload 等运行时文件路径。
// 其他模块不要重复使用 import.meta.url 推导目录，避免相对路径散落在入口逻辑中。

const configDir = dirname(fileURLToPath(import.meta.url));
export const electronRoot = join(configDir, "..");

export function getElectronPublicPath(fileName: string) {
	return join(electronRoot, "..", "public", fileName);
}

export function getElectronTemplatePath(fileName: string) {
	return join(electronRoot, "template", fileName);
}

export function getPreloadDistPath(fileName: string) {
	return join(electronRoot, "preload", "dist", fileName);
}
