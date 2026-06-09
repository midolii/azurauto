import { BrowserWindow } from "electron";
import type { LogEntry, LogLevel } from "../ipc/contract/index.ts";
import { rendererEventChannels } from "../ipc/contract/index.ts";

const entries: LogEntry[] = [];
const maxEntries = 500;

export function getLogEntries() {
	return entries;
}

export function clearLogEntries() {
	entries.splice(0, entries.length);
	return entries;
}

export function logEntry(input: {
	level?: LogLevel;
	scope: string;
	message: string;
	durationMs?: number;
}) {
	const entry: LogEntry = {
		id: crypto.randomUUID(),
		level: input.level ?? "info",
		scope: input.scope,
		message: input.message,
		timestamp: new Date().toISOString(),
		durationMs: input.durationMs,
	};

	entries.push(entry);
	if (entries.length > maxEntries) {
		entries.splice(0, entries.length - maxEntries);
	}

	console.log(formatLogEntry(entry));
	for (const window of BrowserWindow.getAllWindows()) {
		window.webContents.send(rendererEventChannels.loggerEntry, entry);
	}

	return entry;
}

export function logDuration(scope: string, startedAt: number) {
	const durationMs = Date.now() - startedAt;
	return logEntry({
		level: "debug",
		scope,
		message: "completed",
		durationMs,
	});
}

function formatLogEntry(entry: LogEntry) {
	const duration = entry.durationMs === undefined ? "" : ` ${entry.durationMs}ms`;
	return `[azurauto:${entry.level}] ${entry.scope}${duration} ${entry.message}`;
}
