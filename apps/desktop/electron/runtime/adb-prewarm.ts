import type { AdbClient } from "@azurauto/adb";
import { logEntry } from "../logging/global-logger.ts";

// ADB 设备列表预热：启动后后台探测一次，减少用户首次点击 Start 时的冷 listDevices 耗时。
// 失败只记录 warning，不阻塞窗口创建和 renderer 加载。

export async function prewarmAdbDeviceList(adb: AdbClient) {
	const startedAt = Date.now();

	try {
		const devices = await adb.listDevices();
		logEntry({
			level: "debug",
			scope: "startup.adb.prewarmListDevices",
			message: `prewarmed ADB device list (${devices.length} device${devices.length === 1 ? "" : "s"})`,
			durationMs: Date.now() - startedAt,
		});
	} catch (error) {
		logEntry({
			level: "warn",
			scope: "startup.adb.prewarmListDevices",
			message:
				error instanceof Error
					? error.message
					: "ADB device list prewarm failed.",
			durationMs: Date.now() - startedAt,
		});
	}
}
