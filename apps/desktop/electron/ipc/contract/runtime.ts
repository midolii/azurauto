export type ScriptRuntimePhase = "idle" | "starting" | "running" | "pausing" | "paused" | "error";

export type ScriptRuntimeStatus = {
	phase: ScriptRuntimePhase;
	message: string;
	serial?: string;
	screenshotCaptureRunning: boolean;
	lastFrameAt?: string;
	updatedAt: string;
};

export type RuntimeIpcContract = {
	"runtime:getStatus": {
		result: ScriptRuntimeStatus;
	};
	"runtime:start": {
		result: ScriptRuntimeStatus;
	};
	"runtime:pause": {
		result: ScriptRuntimeStatus;
	};
};

export const runtimeIpcChannels = {
	getStatus: "runtime:getStatus",
	start: "runtime:start",
	pause: "runtime:pause",
} as const satisfies Record<string, keyof RuntimeIpcContract>;
