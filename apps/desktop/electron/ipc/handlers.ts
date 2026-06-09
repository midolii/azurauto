import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import type { DeviceBootstrapService } from "@azurauto/automation";
import { type IpcMainInvokeEvent, ipcMain } from "electron";
import {
	type IpcChannel,
	type IpcInvokeArgs,
	type IpcResult,
	ipcChannels,
} from "./contract.ts";

let scrcpyProcess: ChildProcessWithoutNullStreams | undefined;
let scrcpyStatusMessage = "scrcpy 预览未启动。";

type IpcHandler<Channel extends IpcChannel> = (
	event: IpcMainInvokeEvent,
	...args: IpcInvokeArgs<Channel>
) => IpcResult<Channel> | Promise<IpcResult<Channel>>;

/**
 * Typed wrapper around ipcMain.handle.
 * ipcMain.handle 的类型安全包装器。
 *
 * Electron's native ipcMain.handle accepts string channels and unknown args.
 * This helper binds the channel to IpcContract so handler payload/result types
 * stay synchronized with preload calls.
 * Electron 原生 ipcMain.handle 接收字符串 channel 和未知参数。
 * 这个辅助函数会把 channel 绑定到 IpcContract，保证 handler 参数和返回值与 preload 调用保持同步。
 */
function handleIpc<Channel extends IpcChannel>(
	channel: Channel,
	handler: IpcHandler<Channel>,
) {
	ipcMain.handle(channel, (event, ...args) => {
		return handler(event, ...(args as IpcInvokeArgs<Channel>));
	});
}

/**
 * Register all main-process IPC handlers.
 * 注册所有主进程 IPC handlers。
 */
export function registerIpcHandlers(bootstrapService: DeviceBootstrapService) {
	// IPC 只暴露环境状态和重试入口，不再暴露测试用 tap/swipe/screenshot native 方法。
	handleIpc(ipcChannels.environmentGetBootstrapStatus, async () => {
		return bootstrapService.getStatus();
	});

	handleIpc(ipcChannels.environmentRunBootstrap, async () => {
		return bootstrapService.run();
	});

	handleIpc(ipcChannels.environmentCaptureScreenshot, async () => {
		return bootstrapService.captureScreenshot();
	});

	handleIpc(ipcChannels.environmentStartScrcpyPreview, async () => {
		const status = bootstrapService.getStatus();
		if (status.phase !== "ready" || !status.serial) {
			throw new Error("自动化环境未就绪，无法启动 scrcpy 预览。");
		}

		if (scrcpyProcess && !scrcpyProcess.killed) {
			return getScrcpyStatus(status.serial);
		}

		// scrcpy 负责真正的低延迟实时画面；当前阶段先由主进程托管外部预览窗口。
		scrcpyProcess = spawn("scrcpy", [
			"-s",
			status.serial,
			"--no-audio",
			"--no-control",
			"--video-codec=h264",
			"--max-fps=60",
			"--video-bit-rate=8M",
			"--window-title",
			"AzurAuto scrcpy preview",
		]);
		scrcpyStatusMessage = "scrcpy 预览启动中。";

		scrcpyProcess.once("spawn", () => {
			scrcpyStatusMessage = "scrcpy 预览运行中。";
		});
		scrcpyProcess.once("error", (error) => {
			scrcpyStatusMessage = `scrcpy 启动失败：${error.message}`;
			scrcpyProcess = undefined;
		});
		scrcpyProcess.once("close", (code) => {
			scrcpyStatusMessage = `scrcpy 预览已退出${code === null ? "" : `，退出码 ${code}`}。`;
			scrcpyProcess = undefined;
		});
		scrcpyProcess.stderr.on("data", (chunk) => {
			const message = chunk.toString().trim();
			if (message) {
				scrcpyStatusMessage = message;
			}
		});

		return getScrcpyStatus(status.serial);
	});

	handleIpc(ipcChannels.environmentStopScrcpyPreview, async () => {
		if (scrcpyProcess && !scrcpyProcess.killed) {
			scrcpyProcess.kill("SIGTERM");
			scrcpyStatusMessage = "正在停止 scrcpy 预览。";
		}

		return getScrcpyStatus(bootstrapService.getStatus().serial);
	});

	handleIpc(ipcChannels.environmentGetScrcpyPreviewStatus, async () => {
		return getScrcpyStatus(bootstrapService.getStatus().serial);
	});
}

function getScrcpyStatus(serial?: string) {
	return {
		running: Boolean(scrcpyProcess && !scrcpyProcess.killed),
		pid: scrcpyProcess?.pid,
		serial,
		message: scrcpyStatusMessage,
		updatedAt: new Date().toISOString(),
	};
}
