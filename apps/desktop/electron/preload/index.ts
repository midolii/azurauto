import { registerEnvironmentPreload } from "./environment.ts";

/**
 * Electron 只有一个 preload 入口，这里统一注册各领域的 native bridge。
 *
 * 注意：这个 TypeScript 文件不会被 Electron 直接执行。
 * 构建脚本会把它打包为 dist/index.cjs，Electron 只加载打包产物。
 */
registerEnvironmentPreload();

export type { EnvironmentApi } from "./environment.ts";
