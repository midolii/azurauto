import { type IpcMainInvokeEvent, ipcMain } from "electron";
import type {
	IpcChannel,
	IpcInvokeArgs,
	IpcResult,
} from "../contract/index.ts";

export type IpcHandler<Channel extends IpcChannel> = (
	event: IpcMainInvokeEvent,
	...args: IpcInvokeArgs<Channel>
) => IpcResult<Channel> | Promise<IpcResult<Channel>>;

/**
 * Typed wrapper around ipcMain.handle.
 * ipcMain.handle 的类型安全包装器。
 *
 * Electron 原生 ipcMain.handle 接收字符串 channel 和未知参数。
 * 这里统一绑定 IpcContract，业务模块只负责各自领域的 handler 实现。
 */
export function handleIpc<Channel extends IpcChannel>(
	channel: Channel,
	handler: IpcHandler<Channel>,
) {
	ipcMain.handle(channel, (event, ...args) => {
		return handler(event, ...(args as IpcInvokeArgs<Channel>));
	});
}
