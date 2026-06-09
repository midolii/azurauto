import type { DeviceBootstrapService } from "@azurauto/automation";
import { ipcChannels, type ScriptRuntimeStatus } from "../contract/index.ts";
import { logEntry } from "../../logging/global-logger.ts";
import { handleIpc } from "./typed-handle.ts";

let runtimeStatus = createRuntimeStatus("idle", "脚本未运行。", false);
let runtimeLoopAbort: AbortController | undefined;

export function registerRuntimeIpcHandlers(
	bootstrapService: DeviceBootstrapService,
) {
	handleIpc(ipcChannels.runtimeGetStatus, async () => runtimeStatus);

	handleIpc(ipcChannels.runtimeStart, async () => {
		if (runtimeStatus.phase === "running" || runtimeStatus.phase === "starting") {
			logEntry({
				level: "debug",
				scope: "runtime.start.skip",
				message: `runtime start skipped because phase is ${runtimeStatus.phase}`,
			});
			return runtimeStatus;
		}

		runtimeStatus = createRuntimeStatus(
			"starting",
			"正在连接 ADB 并准备脚本截图输入。",
			false,
		);

		const currentBootstrapStatus = bootstrapService.getStatus();
		const canReuseWarmBootstrap =
			currentBootstrapStatus.phase === "ready" && currentBootstrapStatus.serial;
		const bootstrapStatus = canReuseWarmBootstrap
			? currentBootstrapStatus
			: await bootstrapService.run();

		if (canReuseWarmBootstrap) {
			logEntry({
				level: "debug",
				scope: "runtime.start.warmBootstrapReuse",
				message: "reused ready bootstrap status without running ADB checks",
			});
		}

		if (bootstrapStatus.phase !== "ready" || !bootstrapStatus.serial) {
			runtimeStatus = createRuntimeStatus(
				"error",
				bootstrapStatus.message,
				false,
				bootstrapStatus.serial,
			);

			return runtimeStatus;
		}

		startScreenshotCaptureLoop(bootstrapService, bootstrapStatus.serial);
		runtimeStatus = createRuntimeStatus(
			"running",
			"脚本运行中，uiautomator 截图输入已启动。",
			true,
			bootstrapStatus.serial,
		);

		return runtimeStatus;
	});

	handleIpc(ipcChannels.runtimePause, async () => {
		if (runtimeStatus.phase !== "running" && runtimeStatus.phase !== "starting") {
			runtimeStatus = createRuntimeStatus(
				"paused",
				"脚本已暂停。",
				false,
				runtimeStatus.serial,
			);

			return runtimeStatus;
		}

		runtimeStatus = createRuntimeStatus(
			"pausing",
			"正在暂停脚本截图输入。",
			false,
			runtimeStatus.serial,
		);
		runtimeLoopAbort?.abort();
		runtimeLoopAbort = undefined;
		runtimeStatus = createRuntimeStatus(
			"paused",
			"脚本已暂停，设备连接保持 warm。",
			false,
			runtimeStatus.serial,
		);

		return runtimeStatus;
	});
}

export function cleanupRuntimeIpcResources() {
	runtimeLoopAbort?.abort();
	runtimeLoopAbort = undefined;
}

function startScreenshotCaptureLoop(
	bootstrapService: DeviceBootstrapService,
	serial: string,
) {
	runtimeLoopAbort?.abort();
	const abortController = new AbortController();
	runtimeLoopAbort = abortController;

	void (async () => {
		while (!abortController.signal.aborted) {
			try {
				await bootstrapService.captureScreenshot();
				runtimeStatus = {
					...runtimeStatus,
					lastFrameAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};
			} catch (error) {
				if (!abortController.signal.aborted) {
					runtimeStatus = createRuntimeStatus(
						"error",
						error instanceof Error ? error.message : "截图采集失败。",
						false,
						serial,
					);
				}
				break;
			}

			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	})();
}

function createRuntimeStatus(
	phase: ScriptRuntimeStatus["phase"],
	message: string,
	screenshotCaptureRunning: boolean,
	serial?: string,
): ScriptRuntimeStatus {
	return {
		phase,
		message,
		serial,
		screenshotCaptureRunning,
		updatedAt: new Date().toISOString(),
	};
}
