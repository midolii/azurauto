import type { BootstrapStatus, ScreenshotFrame } from "@azurauto/automation";
import type { StartupResourceStatus } from "../../utils/resource-preparation.ts";

export type { StartupResourceStatus } from "../../utils/resource-preparation.ts";

export type EnvironmentIpcContract = {
	"environment:getBootstrapStatus": {
		result: BootstrapStatus;
	};
	"environment:getResourceStatus": {
		result: StartupResourceStatus;
	};
	"environment:prepareResources": {
		result: StartupResourceStatus;
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
	getResourceStatus: "environment:getResourceStatus",
	prepareResources: "environment:prepareResources",
	runBootstrap: "environment:runBootstrap",
	captureScreenshot: "environment:captureScreenshot",
} as const satisfies Record<string, keyof EnvironmentIpcContract>;
