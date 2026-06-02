import { contextBridge, ipcRenderer } from "electron";
import {
	type IpcChannel,
	type IpcInvokeArgs,
	type IpcResult,
	ipcChannels,
} from "../ipc/contract.ts";

/**
 * Typed invoke helper constrained by electron/ipc/contract.ts.
 * 受 electron/ipc/contract.ts 约束的类型安全 invoke 辅助函数。
 */
function invoke<Channel extends IpcChannel>(
	channel: Channel,
	...args: IpcInvokeArgs<Channel>
) {
	return ipcRenderer.invoke(channel, ...args) as Promise<IpcResult<Channel>>;
}

export type BotApi = {
	tap(x: number, y: number): Promise<boolean>;
	swipe(data: {
		x1: number;
		y1: number;
		x2: number;
		y2: number;
	}): Promise<boolean>;
	screenshot(): Promise<string>;
};

const bot: BotApi = {
	tap: (x, y) => invoke(ipcChannels.adbTap, { x, y }),
	swipe: (data) => invoke(ipcChannels.adbSwipe, data),
	screenshot: () => invoke(ipcChannels.adbScreenshot),
};

/**
 * Expose a small, explicit API surface instead of leaking ipcRenderer to the page.
 * 只暴露明确的小型 API，避免把 ipcRenderer 直接泄露给页面。
 */
contextBridge.exposeInMainWorld("bot", bot);
