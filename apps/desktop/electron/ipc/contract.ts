import type { BootstrapStatus, ScreenshotFrame } from "@azurauto/automation";
import type {
	EmbeddedScrcpyVideoMetadata,
	EmbeddedScrcpyVideoPacket,
} from "@azurauto/adb";

export type ScrcpyPreviewStatus = {
	running: boolean;
	serial?: string;
	message: string;
	updatedAt: string;
};

export type ScrcpyPreviewConfig = {
	maxFps: number;
	maxSize: number;
};

export type ScrcpyVideoMetadata = EmbeddedScrcpyVideoMetadata;

export type ScrcpyVideoPacket = EmbeddedScrcpyVideoPacket;

export type ScrcpyVideoEvent =
	| {
			type: "metadata";
			metadata: ScrcpyVideoMetadata;
	  }
	| {
			type: "packet";
			packet: ScrcpyVideoPacket;
	  }
	| {
			type: "error";
			message: string;
	  }
	| {
			type: "closed";
			message: string;
	  };

/**
 * Shared IPC contract used by both the Electron main process and preload script.
 * Electron 主进程和 preload 脚本共同使用的 IPC 契约。
 *
 * Keep every IPC channel, payload, and result type here so renaming a channel or
 * changing its payload is checked by TypeScript on both sides of the bridge.
 * 所有 IPC channel、参数和返回值都在这里维护，确保改名或改参数时两端都会被 TypeScript 检查。
 */
export type IpcContract = {
	"environment:getBootstrapStatus": {
		result: BootstrapStatus;
	};
	"environment:runBootstrap": {
		result: BootstrapStatus;
	};
	"environment:captureScreenshot": {
		result: ScreenshotFrame;
	};
	"scrcpy:startPreview": {
		payload: ScrcpyPreviewConfig;
		result: ScrcpyPreviewStatus;
	};
	"scrcpy:stopPreview": {
		result: ScrcpyPreviewStatus;
	};
	"scrcpy:getPreviewStatus": {
		result: ScrcpyPreviewStatus;
	};
};

/**
 * Stable channel constants. Prefer these over raw string literals.
 * 稳定的 channel 常量，优先使用它们而不是直接写字符串。
 */
export const ipcChannels = {
	environmentGetBootstrapStatus: "environment:getBootstrapStatus",
	environmentRunBootstrap: "environment:runBootstrap",
	environmentCaptureScreenshot: "environment:captureScreenshot",
	scrcpyStartPreview: "scrcpy:startPreview",
	scrcpyStopPreview: "scrcpy:stopPreview",
	scrcpyGetPreviewStatus: "scrcpy:getPreviewStatus",
} as const satisfies Record<string, keyof IpcContract>;

export const rendererEventChannels = {
	scrcpyVideoEvent: "scrcpy:videoEvent",
} as const;

export type IpcChannel = keyof IpcContract;

export type IpcPayload<Channel extends IpcChannel> =
	IpcContract[Channel] extends {
		payload: infer Payload;
	}
		? Payload
		: undefined;

export type IpcResult<Channel extends IpcChannel> =
	IpcContract[Channel]["result"];

/**
 * Converts each contract entry into the rest arguments accepted by invoke/handle.
 * 将每个契约条目转换为 invoke/handle 可接收的剩余参数类型。
 */
export type IpcInvokeArgs<Channel extends IpcChannel> =
	IpcPayload<Channel> extends undefined ? [] : [payload: IpcPayload<Channel>];
