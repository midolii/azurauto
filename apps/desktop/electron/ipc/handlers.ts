import { AdbClient } from "@azurauto/adb";
import { type IpcMainInvokeEvent, ipcMain } from "electron";
import {
	type IpcChannel,
	type IpcInvokeArgs,
	type IpcResult,
	ipcChannels,
} from "./contract.ts";

type IpcHandler<Channel extends IpcChannel> = (
	event: IpcMainInvokeEvent,
	...args: IpcInvokeArgs<Channel>
) => IpcResult<Channel> | Promise<IpcResult<Channel>>;

/**
 * Typed wrapper around ipcMain.handle.
 * ipcMain.handle 的类型安全包装器。
 *
 * Electron's native ipcMain.handle accepts string channels and unknown args.
 * This helper binds the channel to IpcContract so handler payload/result types
 * stay synchronized with preload calls.
 * Electron 原生 ipcMain.handle 接收字符串 channel 和未知参数。
 * 这个辅助函数会把 channel 绑定到 IpcContract，保证 handler 参数和返回值与 preload 调用保持同步。
 */
function handleIpc<Channel extends IpcChannel>(
	channel: Channel,
	handler: IpcHandler<Channel>,
) {
	ipcMain.handle(channel, (event, ...args) => {
		return handler(event, ...(args as IpcInvokeArgs<Channel>));
	});
}

/**
 * Register all main-process IPC handlers.
 * 注册所有主进程 IPC handlers。
 */
export function registerIpcHandlers() {
	const adb = new AdbClient();

	handleIpc(ipcChannels.adbTap, async (_event, { x, y }) => {
		await adb.tap(x, y);
		return true;
	});

	handleIpc(ipcChannels.adbSwipe, async (_event, payload) => {
		await adb.swipe(payload.x1, payload.y1, payload.x2, payload.y2);
		return true;
	});

	handleIpc(ipcChannels.adbScreenshot, async () => {
		const buffer = await adb.screenshot();
		return buffer.toString("base64");
	});
}
