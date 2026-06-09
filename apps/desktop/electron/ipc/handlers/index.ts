import type { DeviceBootstrapService } from "@azurauto/automation";
import type { AndroidResources } from "../../utils/android-resources.ts";
import { registerEnvironmentIpcHandlers } from "./environment.ts";
import {
	cleanupScrcpyIpcResources,
	registerScrcpyIpcHandlers,
} from "./scrcpy.ts";

/**
 * Register all main-process IPC handlers.
 * 注册所有主进程 IPC handlers。
 *
 * IPC handler 按业务域拆分，入口层只负责组合，避免 environment/scrcpy 生命周期逻辑互相污染。
 */
export function registerIpcHandlers(
	bootstrapService: DeviceBootstrapService,
	resources?: AndroidResources,
) {
	registerEnvironmentIpcHandlers(bootstrapService);
	registerScrcpyIpcHandlers(bootstrapService, resources);
}

export async function cleanupIpcResources() {
	await cleanupScrcpyIpcResources();
}
