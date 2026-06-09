import type { DeviceBootstrapService } from "@azurauto/automation";
import type { AndroidResources } from "../../utils/android-resources.ts";
import type { ResourcePreparationService } from "../../utils/resource-preparation.ts";
import { registerEnvironmentIpcHandlers } from "./environment.ts";
import {
	cleanupRuntimeIpcResources,
	registerRuntimeIpcHandlers,
} from "./runtime.ts";
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
	resourcePreparationService: ResourcePreparationService,
	resources?: AndroidResources,
) {
	registerEnvironmentIpcHandlers(bootstrapService, resourcePreparationService);
	registerRuntimeIpcHandlers(bootstrapService);
	registerScrcpyIpcHandlers(bootstrapService, resources);
}

export async function cleanupIpcResources() {
	cleanupRuntimeIpcResources();
	await cleanupScrcpyIpcResources();
}
