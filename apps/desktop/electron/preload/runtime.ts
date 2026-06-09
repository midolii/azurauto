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

export type RuntimeApi = {
	getStatus(): Promise<IpcResult<"runtime:getStatus">>;
	start(): Promise<IpcResult<"runtime:start">>;
	pause(): Promise<IpcResult<"runtime:pause">>;
};

const runtime: RuntimeApi = {
	getStatus: () => invoke(ipcChannels.runtimeGetStatus),
	start: () => invoke(ipcChannels.runtimeStart),
	pause: () => invoke(ipcChannels.runtimePause),
};

export function registerRuntimePreload() {
	contextBridge.exposeInMainWorld("runtime", runtime);
}
