import { AdbClient } from "@azurauto/adb";
import {
	type AutomationLogEntry,
	DeviceBootstrapService,
	Uiautomator2ScreenshotSource,
	createDefaultAtxInstallStrategy,
	setAutomationLogger,
} from "@azurauto/automation";
import { logEntry } from "../logging/global-logger.ts";
import type { AndroidResources } from "../resources/android-resources.ts";

export type AutomationServices = {
	adb: AdbClient;
	bootstrapService: DeviceBootstrapService;
};

// 自动化服务装配层：组装 ADB、设备 bootstrap、截图源和日志桥接。
// DesktopRuntime 只关心这些服务的生命周期，不需要知道具体依赖如何创建。

export function createAutomationServices(
	resources: AndroidResources,
	adbPort: number,
): AutomationServices {
	setAutomationLogger((entry: AutomationLogEntry) => logEntry(entry));

	const adb = new AdbClient({
		bin: resources.adbPath,
		port: adbPort,
	});
	const bootstrapService = new DeviceBootstrapService({
		adb,
		atx: createDefaultAtxInstallStrategy(resources.atxApkPath),
		screenshotSource: new Uiautomator2ScreenshotSource(adb, {
			jarPath: resources.uiautomator2JarPath,
		}),
		onStatusChange(status) {
			console.log("Environment bootstrap status:", status);
		},
	});

	return { adb, bootstrapService };
}
