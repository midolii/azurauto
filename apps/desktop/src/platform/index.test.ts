// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { desktopPlatform } from "./index.ts";

afterEach(() => {
	vi.unstubAllGlobals();
	delete (window as unknown as Record<string, unknown>).environment;
	delete (window as unknown as Record<string, unknown>).scrcpy;
	delete (window as unknown as Record<string, unknown>).runtime;
	delete (window as unknown as Record<string, unknown>).logger;
});

describe("desktopPlatform", () => {
	it("falls back when no preload APIs exist", () => {
		const capabilities = desktopPlatform.getCapabilities();

		expect(capabilities.runtimeKind).toBe("web");
		expect(capabilities.preload.environment.status).toBe("unavailable");
		expect(capabilities.preload.scrcpy.status).toBe("unavailable");
		expect(capabilities.preload.runtime.status).toBe("unavailable");
		expect(capabilities.preload.logger.status).toBe("unavailable");
		expect(capabilities.screenshot.status).toBe("unavailable");
	});

	it("detects partial preload namespaces", () => {
		vi.stubGlobal("environment", {
			getBootstrapStatus: vi.fn(),
			getResourceStatus: vi.fn(),
			prepareResources: vi.fn(),
			runBootstrap: vi.fn(),
		});
		vi.stubGlobal("scrcpy", {
			startPreview: vi.fn(),
		});
		vi.stubGlobal("runtime", {
			getStatus: vi.fn(),
			start: vi.fn(),
			pause: vi.fn(),
		});
		vi.stubGlobal("logger", {
			getEntries: vi.fn(),
			clearEntries: vi.fn(),
		});

		const capabilities = desktopPlatform.getCapabilities();

		expect(capabilities.preload.environment.status).toBe("degraded");
		expect(capabilities.preload.scrcpy.status).toBe("degraded");
		expect(capabilities.preload.runtime.status).toBe("available");
		expect(capabilities.preload.logger.status).toBe("degraded");
		expect(capabilities.runtimeKind).toBe("electron");
	});

	it("proxies native calls when all preload APIs are available", async () => {
		const environment = {
			getBootstrapStatus: vi.fn(async () => ({ phase: "ready" })),
			getResourceStatus: vi.fn(async () => ({ phase: "ready", ready: true })),
			prepareResources: vi.fn(async () => ({ phase: "ready", ready: true })),
			runBootstrap: vi.fn(async () => ({ phase: "ready" })),
			captureScreenshot: vi.fn(async () => ({
				mimeType: "image/png",
				data: new Uint8Array([1, 2, 3]),
			})),
		};
		const scrcpy = {
			startPreview: vi.fn(async () => ({ running: true })),
			stopPreview: vi.fn(async () => ({ running: false })),
			getPreviewStatus: vi.fn(async () => ({ running: true })),
			onVideoEvent: vi.fn(() => vi.fn()),
		};
		const runtime = {
			getStatus: vi.fn(async () => ({ phase: "idle" })),
			start: vi.fn(async () => ({ phase: "running" })),
			pause: vi.fn(async () => ({ phase: "paused" })),
		};
		const logger = {
			getEntries: vi.fn(async () => []),
			clearEntries: vi.fn(async () => []),
			onEntry: vi.fn(() => vi.fn()),
		};

		vi.stubGlobal("environment", environment);
		vi.stubGlobal("scrcpy", scrcpy);
		vi.stubGlobal("runtime", runtime);
		vi.stubGlobal("logger", logger);

		await desktopPlatform.environment.getBootstrapStatus();
		await desktopPlatform.environment.captureScreenshot();
		await desktopPlatform.scrcpy.startPreview({} as never);
		await desktopPlatform.runtime.start();
		await desktopPlatform.logger.getEntries();

		expect(environment.getBootstrapStatus).toHaveBeenCalledOnce();
		expect(environment.captureScreenshot).toHaveBeenCalledOnce();
		expect(scrcpy.startPreview).toHaveBeenCalledOnce();
		expect(runtime.start).toHaveBeenCalledOnce();
		expect(logger.getEntries).toHaveBeenCalledOnce();
	});

	it("gates screenshot and scrcpy when unavailable", async () => {
		await expect(
			desktopPlatform.environment.captureScreenshot(),
		).rejects.toMatchObject({
			name: "PlatformUnavailableError",
			capability: "screenshot",
		});
		await expect(
			desktopPlatform.scrcpy.startPreview({} as never),
		).resolves.toMatchObject({
			running: false,
		});
		expect(desktopPlatform.scrcpy.onVideoEvent(() => undefined)).toBeTypeOf(
			"function",
		);
	});
});
