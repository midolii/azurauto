import {
	environmentIpcChannels,
	type EnvironmentIpcContract,
} from "./environment.ts";
import { runtimeIpcChannels, type RuntimeIpcContract } from "./runtime.ts";
import { scrcpyIpcChannels, scrcpyRendererEventChannels } from "./scrcpy.ts";
import type { ScrcpyIpcContract } from "./scrcpy.ts";

export type * from "./environment.ts";
export type * from "./runtime.ts";
export type * from "./scrcpy.ts";

/**
 * Shared IPC contract used by both the Electron main process and preload script.
 * Electron 主进程和 preload 脚本共同使用的 IPC 契约。
 *
 * 按业务域拆分 contract 后在这里聚合，避免单文件持续膨胀，同时保持跨进程类型检查入口稳定。
 */
export type IpcContract = EnvironmentIpcContract & RuntimeIpcContract & ScrcpyIpcContract;

/**
 * Stable channel constants. Prefer these over raw string literals.
 * 稳定的 channel 常量，优先使用它们而不是直接写字符串。
 */
export const ipcChannels = {
	environmentGetBootstrapStatus: environmentIpcChannels.getBootstrapStatus,
	environmentGetResourceStatus: environmentIpcChannels.getResourceStatus,
	environmentPrepareResources: environmentIpcChannels.prepareResources,
	environmentRunBootstrap: environmentIpcChannels.runBootstrap,
	environmentCaptureScreenshot: environmentIpcChannels.captureScreenshot,
	runtimeGetStatus: runtimeIpcChannels.getStatus,
	runtimeStart: runtimeIpcChannels.start,
	runtimePause: runtimeIpcChannels.pause,
	scrcpyStartPreview: scrcpyIpcChannels.startPreview,
	scrcpyStopPreview: scrcpyIpcChannels.stopPreview,
	scrcpyGetPreviewStatus: scrcpyIpcChannels.getPreviewStatus,
} as const satisfies Record<string, keyof IpcContract>;

export const rendererEventChannels = {
	scrcpyVideoEvent: scrcpyRendererEventChannels.videoEvent,
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
