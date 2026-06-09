import { type AdbClient, type AdbDevice, AdbError } from "@azurauto/adb";
import { describe, expect, it, vi } from "vitest";
import { DeviceBootstrapService, selectTargetDevice } from "./index";

function createAdb(overrides: Partial<AdbClient>): AdbClient {
	return overrides as AdbClient;
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
		const service = new DeviceBootstrapService({
			adb: createAdb({
				listDevices: vi.fn(async () => [readyDevice()]),
				isPackageInstalled: vi.fn(async () => true),
			}),
		});

		await expect(service.run()).resolves.toMatchObject({ phase: "ready" });
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
			base64: Buffer.from("jpeg-frame").toString("base64"),
		});
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
