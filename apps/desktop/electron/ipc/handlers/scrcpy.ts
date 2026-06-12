import {
	EmbeddedScrcpyClient,
	type EmbeddedScrcpySession,
	type EmbeddedScrcpyVideoMetadata,
	type EmbeddedScrcpyVideoPacket,
} from "@azurauto/adb";
import type { DeviceBootstrapService } from "@azurauto/automation";
import type { WebContents } from "electron";
import type { AndroidResources } from "../../resources/android-resources.ts";
import {
	ipcChannels,
	rendererEventChannels,
	type ScrcpyPreviewConfig,
	type ScrcpyVideoMetadata,
	type ScrcpyVideoEvent,
	type ScrcpyVideoPacket,
} from "../contract/index.ts";
import { handleIpc } from "./typed-handle.ts";

const AZURAUTO_ADB_SERVER_PORT = Number(
	process.env.AZURAUTO_ADB_SERVER_PORT ?? 15_037,
);

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

/**
 * scrcpy IPC 模块负责主进程 native 预览生命周期和 renderer 视频事件转发。
 * Electron IPC 只做编排，实际 ADB/scrcpy 协议能力由 packages/adb 提供。
 */
export function registerScrcpyIpcHandlers(
	bootstrapService: DeviceBootstrapService,
	resources?: AndroidResources,
) {
	embeddedScrcpy = new EmbeddedScrcpyClient({
		adbPort: AZURAUTO_ADB_SERVER_PORT,
		serverPath:
			process.env.AZURAUTO_SCRCPY_SERVER_PATH ?? resources?.scrcpyServerPath,
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

/**
 * 应用退出前统一释放 native 预览资源。
 * 防止 scrcpy 视频流、ADB socket 或设备端进程句柄让 Electron 关闭窗口后仍停留在任务栏/Dock。
 */
export async function cleanupScrcpyIpcResources() {
	await stopEmbeddedScrcpy("应用正在退出，已停止 scrcpy 预览。");
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
				packet: toRendererScrcpyPacket(result.value),
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
	sendScrcpyVideoEvent(webContents, {
		type: "metadata",
		metadata: toRendererScrcpyMetadata(metadata),
	});
}

function sendScrcpyVideoEvent(webContents: WebContents, event: ScrcpyVideoEvent) {
	if (!webContents.isDestroyed()) {
		webContents.send(rendererEventChannels.scrcpyVideoEvent, event);
	}
}

function toRendererScrcpyMetadata(
	metadata: EmbeddedScrcpyVideoMetadata,
): ScrcpyVideoMetadata {
	return {
		codec: metadata.codec,
		width: metadata.width,
		height: metadata.height,
	};
}

function toRendererScrcpyPacket(
	packet: EmbeddedScrcpyVideoPacket,
): ScrcpyVideoPacket {
	return packet as ScrcpyVideoPacket;
}

function formatError(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}
