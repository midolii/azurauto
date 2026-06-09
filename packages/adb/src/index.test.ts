import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { AdbClient, AdbError, normalizeDeviceState } from "./index";

function streamFrom(text: string) {
	return Readable.from([Buffer.from(text)]);
}

describe("normalizeDeviceState", () => {
	it("normalizes known adbkit device states", () => {
		expect(normalizeDeviceState("device")).toBe("device");
		expect(normalizeDeviceState("emulator")).toBe("device");
		expect(normalizeDeviceState("offline")).toBe("offline");
		expect(normalizeDeviceState("unauthorized")).toBe("unauthorized");
		expect(normalizeDeviceState("mystery")).toBe("unknown");
	});
});

describe("AdbClient", () => {
	it("lists devices through the adapter", async () => {
		const client = new AdbClient({
			adapter: {
				listDevices: async () => [
					{ id: "emulator-5554", type: "device" },
					{ id: "offline-device", type: "offline" },
				],
				getDevice: vi.fn(),
			},
		});

		await expect(client.listDevices()).resolves.toEqual([
			{ serial: "emulator-5554", state: "device", rawState: "device" },
			{ serial: "offline-device", state: "offline", rawState: "offline" },
		]);
	});

	it("returns structured shell results", async () => {
		const client = new AdbClient({
			adapter: {
				listDevices: vi.fn(),
				getDevice: () =>
					({
						shell: vi.fn(async () => streamFrom("ok")) as never,
						screencap: vi.fn(),
						isInstalled: vi.fn(),
						install: vi.fn(),
					}) as never,
			},
		});

		await expect(
			client.shell("emulator-5554", "echo ok"),
		).resolves.toMatchObject({
			stdout: "ok",
			stderr: "",
			exitCode: 0,
		});
	});

	it("maps adapter failures to AdbError", async () => {
		const client = new AdbClient({
			adapter: {
				listDevices: async () => {
					throw new Error("connect ECONNREFUSED");
				},
				getDevice: vi.fn(),
			},
		});

		await expect(client.listDevices()).rejects.toMatchObject({
			code: "ADB_NOT_AVAILABLE",
		});
	});

	it("reports timeout errors", async () => {
		const client = new AdbClient({
			timeoutMs: 1,
			adapter: {
				listDevices: () =>
					new Promise((resolve) => setTimeout(() => resolve([]), 20)),
				getDevice: vi.fn(),
			},
		});

		await expect(client.listDevices()).rejects.toBeInstanceOf(AdbError);
		await expect(client.listDevices()).rejects.toMatchObject({
			code: "ADB_TIMEOUT",
		});
	});

	it("checks packages and installs APK files", async () => {
		const isInstalled = vi.fn(async () => true);
		const install = vi.fn(async () => true);
		const client = new AdbClient({
			adapter: {
				listDevices: vi.fn(),
				getDevice: () =>
					({
						shell: vi.fn(),
						screencap: vi.fn(),
						isInstalled: isInstalled as never,
						install: install as never,
					}) as never,
			},
		});

		await expect(
			client.isPackageInstalled("emulator-5554", "com.github.uiautomator"),
		).resolves.toBe(true);
		await expect(
			client.installApk("emulator-5554", "/tmp/atx.apk"),
		).resolves.toBe(true);
		expect(isInstalled).toHaveBeenCalledWith("com.github.uiautomator");
		expect(install).toHaveBeenCalledWith("/tmp/atx.apk");
	});
});
