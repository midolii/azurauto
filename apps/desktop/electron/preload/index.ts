import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load every preload module in this directory.
 * 加载 preload 目录下的所有预加载模块。
 *
 * Electron accepts only one preload entry, so this file acts as the entry point
 * and imports all sibling .ts modules that expose APIs through contextBridge.
 * Electron 只能配置一个 preload 入口，因此这里作为入口文件，统一导入同级的 .ts 模块。
 */
const preloadModules = readdirSync(__dirname)
	.filter((file) => file.endsWith(".ts"))
	.filter((file) => file !== "index.ts")
	.filter((file) => !file.endsWith(".d.ts"))
	.sort();

await Promise.all(
	preloadModules.map(
		(file) => import(pathToFileURL(join(__dirname, file)).href),
	),
);

export type { EnvironmentApi } from "./environment.ts";
