import type { DeviceBootstrapService } from "@azurauto/automation";
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
export function registerIpcHandlers(bootstrapService: DeviceBootstrapService) {
	// IPC 只暴露环境状态和重试入口，不再暴露测试用 tap/swipe/screenshot native 方法。
	handleIpc(ipcChannels.environmentGetBootstrapStatus, async () => {
		return bootstrapService.getStatus();
	});

	handleIpc(ipcChannels.environmentRunBootstrap, async () => {
		return bootstrapService.run();
	});

	handleIpc(ipcChannels.environmentCaptureScreenshot, async () => {
		return bootstrapService.captureScreenshot();
	});
}
