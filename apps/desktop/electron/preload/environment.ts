import { contextBridge, ipcRenderer } from "electron";
import {
	type IpcChannel,
	type IpcInvokeArgs,
	type IpcResult,
	ipcChannels,
} from "../ipc/contract.ts";

function invoke<Channel extends IpcChannel>(
	channel: Channel,
	...args: IpcInvokeArgs<Channel>
) {
	return ipcRenderer.invoke(channel, ...args) as Promise<IpcResult<Channel>>;
}

export type EnvironmentApi = {
	getBootstrapStatus(): Promise<IpcResult<"environment:getBootstrapStatus">>;
	runBootstrap(): Promise<IpcResult<"environment:runBootstrap">>;
	captureScreenshot(): Promise<IpcResult<"environment:captureScreenshot">>;
};

const environment: EnvironmentApi = {
	getBootstrapStatus: () => invoke(ipcChannels.environmentGetBootstrapStatus),
	runBootstrap: () => invoke(ipcChannels.environmentRunBootstrap),
	captureScreenshot: () => invoke(ipcChannels.environmentCaptureScreenshot),
};

/**
 * 正式 preload 只暴露环境检查 API，避免把测试用 ADB 操作能力泄露给渲染进程。
 */
contextBridge.exposeInMainWorld("environment", environment);
