export type PlatformRuntimeKind = "electron" | "web" | "unknown";

export type PlatformCapabilityStatus = "available" | "unavailable" | "degraded";

export type PreloadNamespace = "environment" | "scrcpy" | "runtime" | "logger";

export type PlatformCapability = {
	status: PlatformCapabilityStatus;
	message: string;
	recoverable: boolean;
	nextAction?: string;
	errorCode?: string;
};

export type PlatformCapabilities = {
	runtimeKind: PlatformRuntimeKind;
	preload: Record<PreloadNamespace, PlatformCapability>;
	environment: PlatformCapability;
	adb: PlatformCapability;
	resources: PlatformCapability;
	screenshot: PlatformCapability;
	scrcpy: PlatformCapability;
	runtimeControl: PlatformCapability;
	logging: PlatformCapability;
	videoDecoder: PlatformCapability;
};

export const PLATFORM_NATIVE_UNAVAILABLE = "NATIVE_PRELOAD_UNAVAILABLE";

export const PLATFORM_PARTIAL_NATIVE = "NATIVE_PRELOAD_PARTIAL";

export const PLATFORM_VIDEO_DECODER_UNAVAILABLE = "VIDEO_DECODER_UNAVAILABLE";

export function createCapability(
	status: PlatformCapabilityStatus,
	message: string,
	options: Omit<Partial<PlatformCapability>, "status" | "message"> = {},
): PlatformCapability {
	return {
		status,
		message,
		recoverable: options.recoverable ?? status !== "available",
		...(options.nextAction ? { nextAction: options.nextAction } : {}),
		...(options.errorCode ? { errorCode: options.errorCode } : {}),
	};
}

export function isCapabilityAvailable(capability: PlatformCapability) {
	return capability.status === "available";
}

export class PlatformUnavailableError extends Error {
	readonly code: string;
	readonly capability: string;

	constructor(capability: string, message: string) {
		super(message);
		this.name = "PlatformUnavailableError";
		this.code = PLATFORM_NATIVE_UNAVAILABLE;
		this.capability = capability;
	}
}
