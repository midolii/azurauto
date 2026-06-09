import { registerEnvironmentPreload } from "./environment.ts";
import { registerLoggerPreload } from "./logger.ts";
import { registerRuntimePreload } from "./runtime.ts";
import { registerScrcpyPreload } from "./scrcpy.ts";

/**
 * Electron 只有一个 preload 入口，这里统一注册各领域的 native bridge。
 *
 * 注意：这个 TypeScript 文件不会被 Electron 直接执行。
 * 构建脚本会把它打包为 dist/index.cjs，Electron 只加载打包产物。
 */
registerEnvironmentPreload();
registerLoggerPreload();
registerRuntimePreload();
registerScrcpyPreload();

export type { EnvironmentApi } from "./environment.ts";
export type { LoggerApi } from "./logger.ts";
export type { RuntimeApi } from "./runtime.ts";
export type { ScrcpyApi } from "./scrcpy.ts";
