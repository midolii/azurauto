import { type AdbClient, type AdbDevice, AdbError } from "@azurauto/adb";
import { describe, expect, it, vi } from "vitest";
import { DeviceBootstrapService, selectTargetDevice } from "./index";

function createAdb(overrides: Partial<AdbClient> & Record<string, unknown>): AdbClient {
	return overrides as unknown as AdbClient;
}

function readyDevice(serial = "emulator-5554"): AdbDevice {
	return { serial, state: "device", rawState: "device" };
}

describe("selectTargetDevice", () => {
	it("selects the first ready device", () => {
		expect(
			selectTargetDevice([
				{ serial: "offline", state: "offline", rawState: "offline" },
				{ serial: "ready", state: "device", rawState: "device" },
			]),
		).toMatchObject({ serial: "ready" });
	});

	it("reports no-device when no usable devices exist", () => {
		expect(() => selectTargetDevice([])).toThrow("未发现可用 ADB 设备");
	});
});

describe("DeviceBootstrapService", () => {
	it("becomes ready when ATX is already installed", async () => {
		const listDevicesWithRecovery = vi.fn(async () => [readyDevice()]);
		const service = new DeviceBootstrapService({
			adb: createAdb({
				listDevicesWithRecovery,
				listDevices: vi.fn(async () => [readyDevice()]),
				isPackageInstalled: vi.fn(async () => true),
			}),
		});

		await expect(service.run()).resolves.toMatchObject({ phase: "ready" });
		expect(listDevicesWithRecovery).toHaveBeenCalledOnce();
	});

	it("captures a screenshot frame after bootstrap is ready", async () => {
		const service = new DeviceBootstrapService({
			adb: createAdb({
				listDevices: vi.fn(async () => [readyDevice()]),
				isPackageInstalled: vi.fn(async () => true),
			}),
			screenshotSource: {
				capture: vi.fn(async () => ({
					mimeType: "image/jpeg" as const,
					data: Buffer.from("jpeg-frame"),
				})),
			},
		});

		await service.run();

		await expect(service.captureScreenshot()).resolves.toMatchObject({
			serial: "emulator-5554",
			mimeType: "image/jpeg",
			data: Buffer.from("jpeg-frame"),
		});
	});

	it("shuts down adb and screenshot resources", async () => {
		const killServer = vi.fn(async () => undefined);
		const screenshotShutdown = vi.fn(async () => undefined);
		const service = new DeviceBootstrapService({
			adb: createAdb({
				killServer,
				listDevices: vi.fn(async () => [readyDevice()]),
				isPackageInstalled: vi.fn(async () => true),
			}),
			screenshotSource: {
				capture: vi.fn(async () => ({
					mimeType: "image/jpeg" as const,
					data: Buffer.from("jpeg-frame"),
				})),
				shutdown: screenshotShutdown,
			} as any,
		});

		const shutdown = (service as any).shutdown ?? (service as any).dispose;
		expect(shutdown).toBeTypeOf("function");

		await shutdown.call(service);

		expect(killServer).toHaveBeenCalledOnce();
		expect(screenshotShutdown).toHaveBeenCalledOnce();
	});

	it("retries forwarding on the next local port when adb.forward fails", async () => {
		const forward = vi
			.fn()
			.mockRejectedValueOnce(new AdbError("ADB_SERVER_FAILED", "busy"))
			.mockResolvedValueOnce(undefined);
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({ ok: true, text: async () => "pong" })
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ result: "iVBORw0KGgo=" }),
			});
		vi.stubGlobal("fetch", fetchMock as typeof fetch);

		try {
			const service = new DeviceBootstrapService({
				adb: createAdb({
					listDevices: vi.fn(async () => [readyDevice()]),
					isPackageInstalled: vi.fn(async () => true),
					forward,
				}),
			});

			await service.run();
			await expect(service.captureScreenshot()).resolves.toMatchObject({
				mimeType: "image/png",
				data: Buffer.from("iVBORw0KGgo=", "base64"),
			});

			expect(forward).toHaveBeenNthCalledWith(1, "emulator-5554", "tcp:19008", "tcp:9008");
			expect(forward).toHaveBeenNthCalledWith(2, "emulator-5554", "tcp:19009", "tcp:9008");
			expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:19009/ping", expect.any(Object));
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it("rejects screenshot capture before bootstrap is ready", async () => {
		const service = new DeviceBootstrapService({
			adb: createAdb({}),
			screenshotSource: {
				capture: vi.fn(async () => ({
					mimeType: "image/jpeg" as const,
					data: Buffer.from("jpeg-frame"),
				})),
			},
		});

		await expect(service.captureScreenshot()).rejects.toThrow(
			"自动化环境未就绪",
		);
	});

	it("reports no-adb when ADB is unavailable", async () => {
		const service = new DeviceBootstrapService({
			adb: createAdb({
				listDevices: vi.fn(async () => {
					throw new AdbError("ADB_NOT_AVAILABLE", "missing");
				}),
			}),
		});

		await expect(service.run()).resolves.toMatchObject({
			phase: "no-adb",
			errorCode: "ADB_NOT_AVAILABLE",
		});
	});

	it("reports no-device when no emulator is opened", async () => {
		const service = new DeviceBootstrapService({
			adb: createAdb({ listDevices: vi.fn(async () => []) }),
		});

		await expect(service.run()).resolves.toMatchObject({ phase: "no-device" });
	});

	it("installs ATX and verifies again", async () => {
		const install = vi.fn(async () => undefined);
		const isPackageInstalled = vi.fn(
			async () => isPackageInstalled.mock.calls.length > 1,
		);
		const service = new DeviceBootstrapService({
			adb: createAdb({
				listDevices: vi.fn(async () => [readyDevice()]),
				isPackageInstalled,
			}),
			atx: { packageName: "com.github.uiautomator", install },
		});

		await expect(service.run()).resolves.toMatchObject({ phase: "ready" });
		expect(install).toHaveBeenCalledOnce();
	});

	it("reports install failure when ATX is still missing", async () => {
		const service = new DeviceBootstrapService({
			adb: createAdb({
				listDevices: vi.fn(async () => [readyDevice()]),
				isPackageInstalled: vi.fn(async () => false),
			}),
			atx: {
				packageName: "com.github.uiautomator",
				install: vi.fn(async () => undefined),
			},
		});

		await expect(service.run()).resolves.toMatchObject({
			phase: "failed",
			errorCode: "ATX_INSTALL_FAILED",
		});
	});
});
