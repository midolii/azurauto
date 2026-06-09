import type { BootstrapStatus, ScreenshotFrame } from "@azurauto/automation";

export type EnvironmentIpcContract = {
	"environment:getBootstrapStatus": {
		result: BootstrapStatus;
	};
	"environment:runBootstrap": {
		result: BootstrapStatus;
	};
	"environment:captureScreenshot": {
		result: ScreenshotFrame;
	};
};

export const environmentIpcChannels = {
	getBootstrapStatus: "environment:getBootstrapStatus",
	runBootstrap: "environment:runBootstrap",
	captureScreenshot: "environment:captureScreenshot",
} as const satisfies Record<string, keyof EnvironmentIpcContract>;
