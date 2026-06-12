import type { BootstrapStatus, ScreenshotFrame } from "@azurauto/automation";
import type {
	LogEntry,
	ScrcpyPreviewConfig,
	ScrcpyPreviewStatus,
	ScriptRuntimeStatus,
	StartupResourceStatus,
} from "../../electron/ipc/contract/index.ts";
import type {
	EnvironmentApi,
	LoggerApi,
	RuntimeApi,
	ScrcpyApi,
} from "../../electron/preload/index.ts";
import {
	createCapability,
	PLATFORM_NATIVE_UNAVAILABLE,
	PLATFORM_PARTIAL_NATIVE,
	type PlatformCapabilities,
	type PlatformCapability,
	type PlatformRuntimeKind,
	PlatformUnavailableError,
} from "./capabilities.ts";

type PreloadApis = {
	environment?: EnvironmentApi;
	logger?: LoggerApi;
	runtime?: RuntimeApi;
	scrcpy?: ScrcpyApi;
};

type BrowserWindowWithPreload = Window & PreloadApis;

const nativeUnavailableMessage =
	"当前运行环境没有桌面端 native bridge，ADB、截图和 scrcpy 能力不可用。请使用桌面端连接本机设备。";

export const desktopPlatform = {
	getCapabilities,
	environment: {
		getBootstrapStatus: () =>
			getPreloadApi("environment")?.getBootstrapStatus?.() ??
			Promise.resolve(createNativeUnavailableBootstrapStatus()),
		getResourceStatus: () =>
			getPreloadApi("environment")?.getResourceStatus?.() ??
			Promise.resolve(createNativeUnavailableResourceStatus()),
		prepareResources: () =>
			getPreloadApi("environment")?.prepareResources?.() ??
			Promise.resolve(createNativeUnavailableResourceStatus()),
		runBootstrap: () =>
			getPreloadApi("environment")?.runBootstrap?.() ??
			Promise.resolve(createNativeUnavailableBootstrapStatus()),
		captureScreenshot: async (): Promise<ScreenshotFrame> => {
			const environment = getPreloadApi("environment");
			if (!environment?.captureScreenshot) {
				throw new PlatformUnavailableError(
					"screenshot",
					"当前运行环境不支持本机截图能力。请在桌面端并完成 ADB/ATX 检查后重试。",
				);
			}

			return environment.captureScreenshot();
		},
	},
	scrcpy: {
		startPreview: (config: ScrcpyPreviewConfig) => {
			const scrcpy = getPreloadApi("scrcpy");
			return (
				scrcpy?.startPreview?.(config) ??
				Promise.resolve(createUnavailableScrcpyStatus())
			);
		},
		stopPreview: () =>
			getPreloadApi("scrcpy")?.stopPreview?.() ??
			Promise.resolve(
				createUnavailableScrcpyStatus(
					"scrcpy native bridge 不可用，预览未启动。",
				),
			),
		getPreviewStatus: () =>
			getPreloadApi("scrcpy")?.getPreviewStatus?.() ??
			Promise.resolve(createUnavailableScrcpyStatus()),
		onVideoEvent: (callback: Parameters<ScrcpyApi["onVideoEvent"]>[0]) =>
			getPreloadApi("scrcpy")?.onVideoEvent?.(callback) ?? (() => undefined),
	},
	runtime: {
		getStatus: () =>
			getPreloadApi("runtime")?.getStatus?.() ??
			Promise.resolve(
				createRuntimeStatus(
					"idle",
					"当前 Web 环境没有脚本运行时 native bridge。",
				),
			),
		start: () =>
			getPreloadApi("runtime")?.start?.() ??
			Promise.resolve(
				createRuntimeStatus("error", "当前运行环境不支持启动本机脚本运行时。"),
			),
		pause: () =>
			getPreloadApi("runtime")?.pause?.() ??
			Promise.resolve(
				createRuntimeStatus("error", "当前运行环境不支持暂停本机脚本运行时。"),
			),
	},
	logger: {
		getEntries: () =>
			getPreloadApi("logger")?.getEntries?.() ?? Promise.resolve([]),
		clearEntries: () =>
			getPreloadApi("logger")?.clearEntries?.() ?? Promise.resolve([]),
		onEntry: (callback: (entry: LogEntry) => void) =>
			getPreloadApi("logger")?.onEntry?.(callback) ?? (() => undefined),
	},
};

export type DesktopPlatform = typeof desktopPlatform;

/**
 * Renderer 唯一读取 preload/native 可用性的入口。
 * 缺少 native bridge 时返回数据化的 unavailable 状态，而不是让页面直接访问 window.* 后崩溃。
 */
function getCapabilities(): PlatformCapabilities {
	const environmentMethods = getApiMethods("environment", [
		"getBootstrapStatus",
		"getResourceStatus",
		"prepareResources",
		"runBootstrap",
		"captureScreenshot",
	]);
	const scrcpyMethods = getApiMethods("scrcpy", [
		"startPreview",
		"stopPreview",
		"getPreviewStatus",
		"onVideoEvent",
	]);
	const runtimeMethods = getApiMethods("runtime", [
		"getStatus",
		"start",
		"pause",
	]);
	const loggerMethods = getApiMethods("logger", [
		"getEntries",
		"clearEntries",
		"onEntry",
	]);

	const environment = capabilityFromMethodState(
		environmentMethods,
		"环境 bootstrap native bridge 可用。",
		"环境 bootstrap native bridge 不可用。",
	);
	const scrcpy = capabilityFromMethodState(
		scrcpyMethods,
		"scrcpy native bridge 可用。",
		"scrcpy native bridge 不可用。",
	);
	const runtimeControl = capabilityFromMethodState(
		runtimeMethods,
		"脚本运行时 native bridge 可用。",
		"脚本运行时 native bridge 不可用。",
	);
	const logging = capabilityFromMethodState(
		loggerMethods,
		"日志 native bridge 可用。",
		"日志 native bridge 不可用，使用空日志 fallback。",
	);
	const screenshot = environmentMethods.availableMethods.includes(
		"captureScreenshot",
	)
		? createCapability("available", "uiautomator2 截图 native bridge 可用。", {
				recoverable: false,
			})
		: createCapability(
				environmentMethods.exists ? "degraded" : "unavailable",
				"截图 native bridge 不可用。请使用桌面端并完成 ADB/ATX 检查。",
				{
					errorCode: environmentMethods.exists
						? PLATFORM_PARTIAL_NATIVE
						: PLATFORM_NATIVE_UNAVAILABLE,
				},
			);

	return {
		runtimeKind: detectRuntimeKind(),
		preload: {
			environment,
			scrcpy,
			runtime: runtimeControl,
			logger: logging,
		},
		environment,
		adb: environment,
		resources: environmentMethods.availableMethods.includes("prepareResources")
			? createCapability("available", "本地资源准备 native bridge 可用。", {
					recoverable: false,
				})
			: createCapability("unavailable", "本地资源准备 native bridge 不可用。", {
					errorCode: PLATFORM_NATIVE_UNAVAILABLE,
				}),
		screenshot,
		scrcpy,
		runtimeControl,
		logging,
		videoDecoder: getBrowserVideoDecoderCapability(),
	};
}

function getApiMethods<K extends keyof PreloadApis>(
	name: K,
	methods: string[],
) {
	const api = getPreloadApi(name) as Record<string, unknown> | undefined;
	const availableMethods = methods.filter(
		(method) => typeof api?.[method] === "function",
	);

	return {
		exists: Boolean(api),
		complete: availableMethods.length === methods.length,
		availableMethods,
	};
}

function capabilityFromMethodState(
	state: ReturnType<typeof getApiMethods>,
	availableMessage: string,
	unavailableMessage: string,
): PlatformCapability {
	if (state.complete) {
		return createCapability("available", availableMessage, {
			recoverable: false,
		});
	}

	if (state.exists) {
		return createCapability("degraded", unavailableMessage, {
			errorCode: PLATFORM_PARTIAL_NATIVE,
			nextAction: "请检查 preload 注册是否完整，或重启桌面端。",
		});
	}

	return createCapability("unavailable", unavailableMessage, {
		errorCode: PLATFORM_NATIVE_UNAVAILABLE,
		nextAction: "请使用 AzurAuto 桌面端运行本机设备能力。",
	});
}

function getPreloadApi<K extends keyof PreloadApis>(name: K): PreloadApis[K] {
	if (typeof window === "undefined") {
		return undefined;
	}

	return (window as BrowserWindowWithPreload)[name];
}

function detectRuntimeKind(): PlatformRuntimeKind {
	if (typeof window === "undefined") {
		return "unknown";
	}

	const hasAnyPreload = ["environment", "scrcpy", "runtime", "logger"].some(
		(name) => Boolean((window as unknown as Record<string, unknown>)[name]),
	);

	return hasAnyPreload ? "electron" : "web";
}

function getBrowserVideoDecoderCapability(): PlatformCapability {
	if (typeof globalThis.VideoDecoder === "undefined") {
		return createCapability(
			"unavailable",
			"当前环境不支持 WebCodecs VideoDecoder。",
			{
				errorCode: "VIDEO_DECODER_UNAVAILABLE",
				nextAction:
					"请使用支持 WebCodecs 的桌面端 WebContents，或切换到截图预览。",
			},
		);
	}

	return createCapability("available", "WebCodecs VideoDecoder 可用。", {
		recoverable: false,
	});
}

function createNativeUnavailableBootstrapStatus(): BootstrapStatus {
	return {
		phase: "failed",
		message: nativeUnavailableMessage,
		recoverable: false,
		nextAction: "请使用桌面端连接本机模拟器或 Android 设备。",
		errorCode: "UNKNOWN",
		updatedAt: new Date().toISOString(),
	};
}

function createNativeUnavailableResourceStatus(): StartupResourceStatus {
	return {
		phase: "failed",
		message: nativeUnavailableMessage,
		ready: false,
		missing: ["electron-preload"],
		warnings: [
			"Web-only/native-missing 环境不会准备本地 ADB、scrcpy 或 uiautomator2 资源。",
		],
		updatedAt: new Date().toISOString(),
	};
}

function createUnavailableScrcpyStatus(
	message = "当前运行环境不支持 scrcpy native 预览。",
): ScrcpyPreviewStatus {
	return {
		running: false,
		message,
		updatedAt: new Date().toISOString(),
	};
}

function createRuntimeStatus(
	phase: ScriptRuntimeStatus["phase"],
	message: string,
): ScriptRuntimeStatus {
	return {
		phase,
		message,
		screenshotCaptureRunning: false,
		updatedAt: new Date().toISOString(),
	};
}

export type {
	PlatformCapabilities,
	PlatformCapability,
	PlatformCapabilityStatus,
	PlatformRuntimeKind,
} from "./capabilities.ts";
