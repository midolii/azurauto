import { contextBridge, ipcRenderer } from "electron";
import {
	type IpcChannel,
	type IpcInvokeArgs,
	type IpcResult,
	type LogEntry,
	ipcChannels,
	rendererEventChannels,
} from "../ipc/contract/index.ts";

function invoke<Channel extends IpcChannel>(
	channel: Channel,
	...args: IpcInvokeArgs<Channel>
) {
	return ipcRenderer.invoke(channel, ...args) as Promise<IpcResult<Channel>>;
}

export type LoggerApi = {
	getEntries(): Promise<IpcResult<"logger:getEntries">>;
	clearEntries(): Promise<IpcResult<"logger:clearEntries">>;
	onEntry(callback: (entry: LogEntry) => void): () => void;
};

const logger: LoggerApi = {
	getEntries: () => invoke(ipcChannels.loggerGetEntries),
	clearEntries: () => invoke(ipcChannels.loggerClearEntries),
	onEntry: (callback) => {
		const listener = (_event: Electron.IpcRendererEvent, entry: LogEntry) => {
			callback(entry);
		};
		ipcRenderer.on(rendererEventChannels.loggerEntry, listener);

		return () => {
			ipcRenderer.off(rendererEventChannels.loggerEntry, listener);
		};
	},
};

export function registerLoggerPreload() {
	contextBridge.exposeInMainWorld("logger", logger);
}
