import { contextBridge, ipcRenderer } from "electron";
import {
	type IpcChannel,
	type IpcInvokeArgs,
	type IpcResult,
	ipcChannels,
} from "../ipc/contract/index.ts";

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
 * 注册环境与预览相关 native bridge。
 * 后续新增其他领域 API 时，新增独立 preload 模块并在 index.ts 中统一调用注册函数。
 */
export function registerEnvironmentPreload() {
	contextBridge.exposeInMainWorld("environment", environment);
}
