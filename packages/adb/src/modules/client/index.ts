import { execFile } from "node:child_process";
import type { Readable } from "node:stream";
import { promisify } from "node:util";
import * as AdbKit from "@devicefarmer/adbkit";
import type Client from "@devicefarmer/adbkit/dist/src/adb/client";
import type DeviceClient from "@devicefarmer/adbkit/dist/src/adb/DeviceClient";

export type AdbDeviceState = "device" | "offline" | "unauthorized" | "unknown";

export type AdbDevice = {
	serial: string;
	state: AdbDeviceState;
	rawState: string;
};

export type AdbCommandResult = {
	stdout: string;
	stderr: string;
	exitCode: number | null;
	durationMs: number;
};

export type AdbErrorCode =
	| "ADB_NOT_AVAILABLE"
	| "ADB_TIMEOUT"
	| "ADB_DEVICE_UNAVAILABLE"
	| "ADB_SERVER_FAILED"
	| "ADB_COMMAND_FAILED";

export class AdbError extends Error {
	readonly code: AdbErrorCode;
	readonly cause?: unknown;

	constructor(code: AdbErrorCode, message: string, cause?: unknown) {
		super(message);
		this.name = "AdbError";
		this.code = code;
		this.cause = cause;
	}
}

export type AdbClientOptions = {
	bin?: string;
	host?: string;
	port?: number;
	timeoutMs?: number;
};

export type ListDevicesWithRecoveryOptions = {
	onRecoveryStart?: () => void;
	recoveryDelayMs?: number;
	resetServerBeforeCheck?: boolean;
};

type AdbKitDevice = {
	id: string;
	type: string;
};

type AdbAdapter = {
	listDevices(): Promise<AdbKitDevice[]>;
	getDevice(
		serial: string,
	): Pick<
		DeviceClient,
		"shell" | "screencap" | "isInstalled" | "install" | "forward" | "push"
	>;
};

type AdbKitRuntime = {
	createClient(options?: {
		bin?: string;
		host?: string;
		port?: number;
		timeout?: number;
	}): Client;
	util: {
		readAll(stream: NodeJS.ReadWriteStream): Promise<Buffer>;
	};
};

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RECOVERY_DELAY_MS = 1_500;
const execFileAsync = promisify(execFile);

const adbKitRuntime = resolveAdbKitRuntime();

// client 子模块封装 adbkit：负责普通 ADB 命令、文件推送、APK 安装和错误映射。
// 其他 package 只能依赖这里的稳定类型与方法，不直接接触 adbkit 的运行时差异。

/**
 * `packages/adb` 是项目唯一接触第三方 ADB 库的适配层。
 * 上层 Electron/native 和自动化服务只依赖这里导出的稳定接口，后续替换底层库时不需要改业务层。
 */
export class AdbClient {
	private readonly adapter: AdbAdapter;
	private readonly bin?: string;
	private readonly host?: string;
	private readonly port?: number;
	private readonly timeoutMs: number;

	constructor(options: AdbClientOptions & { adapter?: AdbAdapter } = {}) {
		this.bin = options.bin;
		this.host = options.host;
		this.port = options.port;
		this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
		this.adapter =
			options.adapter ??
			(adbKitRuntime.createClient({
				bin: options.bin,
				host: options.host,
				port: options.port,
				timeout: this.timeoutMs,
			}) as Client);
	}

	async listDevices(): Promise<AdbDevice[]> {
		const devices = await this.runWithErrorMapping(
			() => this.adapter.listDevices(),
			"ADB_NOT_AVAILABLE",
			"无法连接 ADB，请确认 adb 已安装并在 PATH 中。",
		);

		return devices.map((device) => ({
			serial: device.id,
			state: normalizeDeviceState(device.type),
			rawState: device.type,
		}));
	}

	async listDevicesWithRecovery(
		options: ListDevicesWithRecoveryOptions = {},
	): Promise<AdbDevice[]> {
		const shouldRecover = (error: unknown, devices: AdbDevice[]) =>
			devices.length === 0 ||
			(error instanceof AdbError && error.code === "ADB_TIMEOUT");

		let devices: AdbDevice[] = [];
		if (options.resetServerBeforeCheck) {
			options.onRecoveryStart?.();
			await this.restartServer();
			await sleep(options.recoveryDelayMs ?? DEFAULT_RECOVERY_DELAY_MS);
			devices = await this.listDevices();
			if (!shouldRecover(undefined, devices)) {
				return devices;
			}
		}

		try {
			devices = await this.listDevices();
			if (!shouldRecover(undefined, devices)) {
				return devices;
			}
		} catch (error) {
			if (!shouldRecover(error, devices)) {
				throw error;
			}
		}

		options.onRecoveryStart?.();
		await this.startServer();
		await sleep(options.recoveryDelayMs ?? DEFAULT_RECOVERY_DELAY_MS);

		try {
			devices = await this.listDevices();
			if (!shouldRecover(undefined, devices)) {
				return devices;
			}
		} catch (error) {
			if (!shouldRecover(error, devices)) {
				throw error;
			}
		}

		await this.restartServer();
		await sleep(options.recoveryDelayMs ?? DEFAULT_RECOVERY_DELAY_MS);
		return this.listDevices();
	}

	async startServer(): Promise<void> {
		await this.runAdbServerCommand("start-server");
	}

	async killServer(): Promise<void> {
		await this.runAdbServerCommand("kill-server");
	}

	async restartServer(): Promise<void> {
		await this.killServer();
		await this.startServer();
	}

	async shell(serial: string, command: string): Promise<AdbCommandResult> {
		const startedAt = Date.now();

		// shell 由 adbkit 返回 stdout stream；stderr/exitCode 在该库 API 中不可直接获得，统一由适配层补齐结构。
		const stdout = await this.runWithErrorMapping(
			async () => {
				const stream = await this.device(serial).shell(command);
				const buffer = (await this.withTimeout(
					adbKitRuntime.util.readAll(stream),
					`ADB shell command timed out: ${command}`,
				)) as Buffer;
				return buffer.toString("utf8");
			},
			"ADB_COMMAND_FAILED",
			`ADB shell command failed: ${command}`,
		);

		return {
			stdout,
			stderr: "",
			exitCode: 0,
			durationMs: Date.now() - startedAt,
		};
	}

	async screenshot(serial: string): Promise<Buffer> {
		return this.runWithErrorMapping(
			async () => {
				const stream = await this.device(serial).screencap();
				return (await this.withTimeout(
					adbKitRuntime.util.readAll(stream),
					"ADB screenshot command timed out.",
				)) as Buffer;
			},
			"ADB_COMMAND_FAILED",
			"ADB screenshot command failed.",
		);
	}

	async isPackageInstalled(
		serial: string,
		packageName: string,
	): Promise<boolean> {
		// 包检测优先使用 adbkit 的 isInstalled，屏蔽不同 Android 版本 `pm` 输出差异。
		return this.runWithErrorMapping(
			() => this.device(serial).isInstalled(packageName),
			"ADB_COMMAND_FAILED",
			`Failed to check package: ${packageName}`,
		);
	}

	async installApk(
		serial: string,
		apkPath: string | Readable,
	): Promise<boolean> {
		// 安装命令可能触发设备侧确认或耗时较长，调用方应在自动化层显示 installing 状态。
		return this.runWithErrorMapping(
			() =>
				this.withTimeout(
					this.device(serial).install(apkPath),
					"ADB install command timed out.",
				),
			"ADB_COMMAND_FAILED",
			"ADB install command failed.",
		);
	}

	async forward(
		serial: string,
		local: string,
		remote: string,
	): Promise<boolean> {
		// 端口转发由 ADB 适配层统一处理，上层只声明 local/remote endpoint，不直接依赖 adbkit。
		return this.runWithErrorMapping(
			() => this.device(serial).forward(local, remote),
			"ADB_COMMAND_FAILED",
			`ADB forward failed: ${local} -> ${remote}`,
		);
	}

	async pushFile(
		serial: string,
		localPath: string,
		remotePath: string,
	): Promise<void> {
		// uiautomator2 等设备端资源通过这里统一 push，调用方不需要知道 adbkit PushTransfer 事件细节。
		await this.runWithErrorMapping(
			async () => {
				const transfer = await this.device(serial).push(localPath, remotePath);
				await this.withTimeout(
					new Promise<void>((resolve, reject) => {
						transfer.once("end", resolve);
						transfer.once("error", reject);
					}),
					`ADB push timed out: ${localPath} -> ${remotePath}`,
				);
			},
			"ADB_COMMAND_FAILED",
			`ADB push failed: ${localPath} -> ${remotePath}`,
		);
	}

	private device(serial: string) {
		if (!serial) {
			throw new AdbError(
				"ADB_DEVICE_UNAVAILABLE",
				"Missing ADB device serial.",
			);
		}

		return this.adapter.getDevice(serial);
	}

	private async runWithErrorMapping<T>(
		action: () => Promise<T>,
		code: AdbErrorCode,
		message: string,
	): Promise<T> {
		try {
			return await this.withTimeout(action(), message);
		} catch (error) {
			if (error instanceof AdbError) {
				throw error;
			}

			throw new AdbError(code, message, error);
		}
	}

	private async runAdbServerCommand(command: "kill-server" | "start-server") {
		const args = [
			...(this.host ? ["-H", this.host] : []),
			...(this.port ? ["-P", String(this.port)] : []),
			command,
		];

		await this.runWithErrorMapping(
			() => execFileAsync(this.bin ?? "adb", args),
			"ADB_SERVER_FAILED",
			`ADB ${command} failed.`,
		);
	}

	private async withTimeout<T>(
		promise: Promise<T>,
		message: string,
	): Promise<T> {
		let timer: NodeJS.Timeout | undefined;

		try {
			return await Promise.race([
				promise,
				new Promise<T>((_resolve, reject) => {
					timer = setTimeout(() => {
						reject(new AdbError("ADB_TIMEOUT", message));
					}, this.timeoutMs);
				}),
			]);
		} finally {
			if (timer) {
				clearTimeout(timer);
			}
		}
	}
}

function sleep(ms: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function normalizeDeviceState(rawState: string): AdbDeviceState {
	switch (rawState) {
		case "device":
		case "emulator":
			return "device";
		case "offline":
			return "offline";
		case "unauthorized":
			return "unauthorized";
		default:
			return "unknown";
	}
}

function resolveAdbKitRuntime(): AdbKitRuntime {
	const moduleValue = AdbKit as unknown as {
		createClient?: AdbKitRuntime["createClient"];
		util?: AdbKitRuntime["util"];
		default?: Partial<AdbKitRuntime> & {
			default?: Partial<AdbKitRuntime>;
			Adb?: Partial<AdbKitRuntime>;
		};
		Adb?: Partial<AdbKitRuntime>;
	};

	// @devicefarmer/adbkit 是 CommonJS 输出；Electron 的 ESM 加载在 dev/build 场景下可能拿到不同包装层。
	const runtime = moduleValue.createClient
		? moduleValue
		: moduleValue.default?.createClient
			? moduleValue.default
			: moduleValue.default?.default?.createClient
				? moduleValue.default.default
				: moduleValue.default?.Adb?.createClient
					? moduleValue.default.Adb
					: moduleValue.Adb?.createClient
						? moduleValue.Adb
						: undefined;

	if (!runtime?.createClient || !runtime.util?.readAll) {
		throw new AdbError(
			"ADB_NOT_AVAILABLE",
			"无法加载 ADB 客户端库，请检查 @devicefarmer/adbkit 打包结果。",
		);
	}

	return runtime as AdbKitRuntime;
}
