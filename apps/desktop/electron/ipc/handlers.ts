import {
	EmbeddedScrcpyClient,
	type EmbeddedScrcpyVideoPacket,
	type EmbeddedScrcpyVideoMetadata,
	type EmbeddedScrcpySession,
} from "@azurauto/adb";
import type { DeviceBootstrapService } from "@azurauto/automation";
import { type IpcMainInvokeEvent, type WebContents, ipcMain } from "electron";
import type { AndroidResources } from "../utils/android-resources.ts";
import {
	type IpcChannel,
	type IpcInvokeArgs,
	type IpcResult,
	type ScrcpyPreviewConfig,
	type ScrcpyVideoEvent,
	ipcChannels,
	rendererEventChannels,
} from "./contract.ts";

let embeddedScrcpy = new EmbeddedScrcpyClient({
	serverPath: process.env.AZURAUTO_SCRCPY_SERVER_PATH,
});
let scrcpyStreamReader:
	| {
			read(): Promise<{ done: boolean; value?: EmbeddedScrcpyVideoPacket }>;
			cancel(): Promise<void>;
	  }
	| undefined;
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
export function registerIpcHandlers(
	bootstrapService: DeviceBootstrapService,
	resources?: AndroidResources,
) {
	embeddedScrcpy = new EmbeddedScrcpyClient({
		serverPath:
			process.env.AZURAUTO_SCRCPY_SERVER_PATH ?? resources?.scrcpyServerPath,
	});

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

	handleIpc(ipcChannels.scrcpyStartPreview, async (event, config) => {
		const status = bootstrapService.getStatus();
		if (status.phase !== "ready" || !status.serial) {
			throw new Error("自动化环境未就绪，无法启动 scrcpy 预览。");
		}

		if (embeddedScrcpy.running) {
			return getScrcpyStatus(status.serial);
		}

		scrcpyStatusMessage = "正在通过 @yume-chan/scrcpy 启动内嵌预览。";
		await startEmbeddedScrcpy(status.serial, event.sender, config);

		return getScrcpyStatus(status.serial);
	});

	handleIpc(ipcChannels.scrcpyStopPreview, async () => {
		await stopEmbeddedScrcpy("正在停止 scrcpy 预览。");

		return getScrcpyStatus(bootstrapService.getStatus().serial);
	});

	handleIpc(ipcChannels.scrcpyGetPreviewStatus, async () => {
		return getScrcpyStatus(bootstrapService.getStatus().serial);
	});
}

function getScrcpyStatus(serial?: string) {
	return {
		running: embeddedScrcpy.running,
		serial,
		message: scrcpyStatusMessage,
		updatedAt: new Date().toISOString(),
	};
}

async function startEmbeddedScrcpy(
	serial: string,
	webContents: WebContents,
	config: ScrcpyPreviewConfig,
) {
	try {
		const session = await embeddedScrcpy.start(serial, {
			maxFps: config.maxFps,
			maxSize: config.maxSize,
		});
		scrcpyStatusMessage = "scrcpy 内嵌预览运行中。";
		sendScrcpyMetadata(webContents, session.metadata);

		void pumpScrcpyVideoStream(session, webContents);
	} catch (error) {
		await embeddedScrcpy.stop();
		scrcpyStatusMessage = `scrcpy 内嵌预览启动失败：${formatError(error)}`;
		sendScrcpyVideoEvent(webContents, {
			type: "error",
			message: scrcpyStatusMessage,
		});
		throw error;
	}
}

async function pumpScrcpyVideoStream(
	session: EmbeddedScrcpySession,
	webContents: WebContents,
) {
	const reader = session.stream.getReader();
	scrcpyStreamReader = reader;

	try {
		while (embeddedScrcpy.running) {
			const result = await reader.read();
			if (result.done) {
				break;
			}
			if (!result.value) {
				continue;
			}

			sendScrcpyVideoEvent(webContents, {
				type: "packet",
				packet: result.value,
			});
		}
	} catch (error) {
		scrcpyStatusMessage = `scrcpy 视频流异常：${formatError(error)}`;
		sendScrcpyVideoEvent(webContents, {
			type: "error",
			message: scrcpyStatusMessage,
		});
	} finally {
		scrcpyStreamReader = undefined;
		await stopEmbeddedScrcpy("scrcpy 内嵌预览已停止。", webContents);
	}
}

async function stopEmbeddedScrcpy(message: string, webContents?: WebContents) {
	scrcpyStatusMessage = message;
	const reader = scrcpyStreamReader;
	scrcpyStreamReader = undefined;

	try {
		await reader?.cancel();
	} catch {
		// 流关闭期间可能已经被 scrcpy server 主动断开，忽略二次取消错误。
	}

	try {
		await embeddedScrcpy.stop();
	} catch {
		// 关闭流程用于错误恢复，设备侧连接已断开时不再覆盖原状态信息。
	}

	if (webContents && !webContents.isDestroyed()) {
		sendScrcpyVideoEvent(webContents, { type: "closed", message });
	}
}

function sendScrcpyMetadata(
	webContents: WebContents,
	metadata: EmbeddedScrcpyVideoMetadata,
) {
	sendScrcpyVideoEvent(webContents, { type: "metadata", metadata });
}

function sendScrcpyVideoEvent(webContents: WebContents, event: ScrcpyVideoEvent) {
	if (!webContents.isDestroyed()) {
		webContents.send(rendererEventChannels.scrcpyVideoEvent, event);
	}
}

function formatError(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}
