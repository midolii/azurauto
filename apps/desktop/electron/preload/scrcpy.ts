import { contextBridge, ipcRenderer } from "electron";
import {
	type IpcChannel,
	type IpcInvokeArgs,
	type IpcResult,
	type ScrcpyPreviewConfig,
	type ScrcpyVideoEvent,
	ipcChannels,
	rendererEventChannels,
} from "../ipc/contract/index.ts";

function invoke<Channel extends IpcChannel>(
	channel: Channel,
	...args: IpcInvokeArgs<Channel>
) {
	return ipcRenderer.invoke(channel, ...args) as Promise<IpcResult<Channel>>;
}

export type ScrcpyApi = {
	startPreview(
		config: ScrcpyPreviewConfig,
	): Promise<IpcResult<"scrcpy:startPreview">>;
	stopPreview(): Promise<IpcResult<"scrcpy:stopPreview">>;
	getPreviewStatus(): Promise<IpcResult<"scrcpy:getPreviewStatus">>;
	onVideoEvent(callback: (event: ScrcpyVideoEvent) => void): () => void;
};

const scrcpy: ScrcpyApi = {
	startPreview: (config) => invoke(ipcChannels.scrcpyStartPreview, config),
	stopPreview: () => invoke(ipcChannels.scrcpyStopPreview),
	getPreviewStatus: () => invoke(ipcChannels.scrcpyGetPreviewStatus),
	onVideoEvent: (callback) => {
		const listener = (_event: Electron.IpcRendererEvent, value: ScrcpyVideoEvent) => {
			callback(value);
		};
		ipcRenderer.on(rendererEventChannels.scrcpyVideoEvent, listener);

		return () => {
			ipcRenderer.off(rendererEventChannels.scrcpyVideoEvent, listener);
		};
	},
};

/**
 * 注册 scrcpy 独立 native bridge。
 * 预览/视频流属于设备投屏领域，不再挂在 environment 环境检查作用域下。
 */
export function registerScrcpyPreload() {
	contextBridge.exposeInMainWorld("scrcpy", scrcpy);
}
