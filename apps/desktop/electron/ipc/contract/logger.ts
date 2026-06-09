export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
	id: string;
	level: LogLevel;
	scope: string;
	message: string;
	timestamp: string;
	durationMs?: number;
}

export type LoggerIpcContract = {
	"logger:getEntries": {
		result: LogEntry[];
	};
	"logger:clearEntries": {
		result: LogEntry[];
	};
};

export const loggerIpcChannels = {
	getEntries: "logger:getEntries",
	clearEntries: "logger:clearEntries",
} as const satisfies Record<string, keyof LoggerIpcContract>;

export const loggerRendererEventChannels = {
	entry: "logger:entry",
} as const;
