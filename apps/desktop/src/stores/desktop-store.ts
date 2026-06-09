import { useSyncExternalStore } from "react";

import type {
	LogEntry,
	ScriptRuntimeStatus,
	StartupResourceStatus,
} from "../../electron/ipc/contract/index.ts";

export type DesktopPage = "home" | "debug" | "tasks" | "logs" | "settings";
export type TaskExecutionStatus = "idle" | "running" | "paused" | "completed";

export interface DesktopSettingsState {
	configPath: string | null;
	loadedAt: string | null;
}

export interface ScriptLogEntry {
	id: string;
	message: string;
	timestamp: string;
}

export interface TaskExecutionState {
	name: string;
	status: TaskExecutionStatus;
	elapsedLabel: string;
}

export interface DesktopState {
	activePage: DesktopPage;
	settings: DesktopSettingsState;
	logs: LogEntry[];
	scriptLogs: ScriptLogEntry[];
	taskExecution: TaskExecutionState;
	runtime: ScriptRuntimeStatus;
	resourceStatus: StartupResourceStatus | null;
}

type Listener = () => void;

const initialState: DesktopState = {
	activePage: "home",
	settings: {
		configPath: null,
		loadedAt: null,
	},
	logs: [],
	scriptLogs: [
		{
			id: "welcome-log",
			message: "Script log buffer is ready.",
			timestamp: "Pending run",
		},
	],
	taskExecution: {
		name: "待选择任务",
		status: "idle",
		elapsedLabel: "00:00",
	},
	runtime: {
		phase: "idle",
		message: "脚本未运行。",
		screenshotCaptureRunning: false,
		updatedAt: new Date().toISOString(),
	},
	resourceStatus: null,
};

let state = initialState;
const listeners = new Set<Listener>();

function emit() {
	for (const listener of listeners) {
		listener();
	}
}

function setState(updater: (current: DesktopState) => DesktopState) {
	state = updater(state);
	emit();
}

export const desktopStore = {
	subscribe(listener: Listener) {
		listeners.add(listener);

		return () => listeners.delete(listener);
	},
	getSnapshot() {
		return state;
	},
	setActivePage(activePage: DesktopPage) {
		setState((current) => ({ ...current, activePage }));
	},
	setSettings(settings: Partial<DesktopSettingsState>) {
		setState((current) => ({
			...current,
			settings: { ...current.settings, ...settings },
		}));
	},
	appendScriptLog(message: string) {
		this.appendLog({
			id: crypto.randomUUID(),
			level: "info",
			scope: "script.test",
			message,
			timestamp: new Date().toISOString(),
		});
	},
	appendLog(log: LogEntry) {
		setState((current) => ({
			...current,
			logs: [...current.logs, log].slice(-500),
		}));
	},
	setLogs(logs: LogEntry[]) {
		setState((current) => ({ ...current, logs: logs.slice(-500) }));
	},
	setTaskExecution(taskExecution: Partial<TaskExecutionState>) {
		setState((current) => ({
			...current,
			taskExecution: { ...current.taskExecution, ...taskExecution },
		}));
	},
	setRuntime(runtime: ScriptRuntimeStatus) {
		setState((current) => ({
			...current,
			runtime,
			taskExecution: {
				...current.taskExecution,
				status: toTaskExecutionStatus(runtime.phase),
			},
		}));
	},
	setResourceStatus(resourceStatus: StartupResourceStatus | null) {
		setState((current) => ({ ...current, resourceStatus }));
	},
};

function toTaskExecutionStatus(
	phase: ScriptRuntimeStatus["phase"],
): TaskExecutionStatus {
	if (phase === "running" || phase === "starting") return "running";
	if (phase === "paused" || phase === "pausing") return "paused";
	return "idle";
}

export function useDesktopStore<T>(selector: (state: DesktopState) => T): T {
	return useSyncExternalStore(
		desktopStore.subscribe,
		() => selector(desktopStore.getSnapshot()),
		() => selector(initialState),
	);
}
