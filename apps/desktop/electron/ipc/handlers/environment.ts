import type { DeviceBootstrapService } from "@azurauto/automation";
import type { ResourcePreparationService } from "../../utils/resource-preparation.ts";
import { ipcChannels } from "../contract/index.ts";
import { handleIpc } from "./typed-handle.ts";

/**
 * 环境 bootstrap IPC 模块只暴露状态读取、重试启动和截图入口。
 * 设备选择、ATX 安装和截图资源流仍由 automation package 统一管理。
 */
export function registerEnvironmentIpcHandlers(
	bootstrapService: DeviceBootstrapService,
	resourcePreparationService: ResourcePreparationService,
) {
	handleIpc(ipcChannels.environmentGetBootstrapStatus, async () => {
		return bootstrapService.getStatus();
	});

	handleIpc(ipcChannels.environmentGetResourceStatus, async () => {
		return resourcePreparationService.getStatus();
	});

	handleIpc(ipcChannels.environmentPrepareResources, async () => {
		return resourcePreparationService.prepare();
	});

	handleIpc(ipcChannels.environmentRunBootstrap, async () => {
		return bootstrapService.run();
	});

	handleIpc(ipcChannels.environmentCaptureScreenshot, async () => {
		return bootstrapService.captureScreenshot();
	});
}
