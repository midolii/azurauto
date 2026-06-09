import { ipcChannels } from "../contract/index.ts";
import { clearLogEntries, getLogEntries } from "../../logging/global-logger.ts";
import { handleIpc } from "./typed-handle.ts";

export function registerLoggerIpcHandlers() {
	handleIpc(ipcChannels.loggerGetEntries, async () => getLogEntries());
	handleIpc(ipcChannels.loggerClearEntries, async () => clearLogEntries());
}
