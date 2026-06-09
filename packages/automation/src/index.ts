import { existsSync } from "node:fs";
import { AdbClient, type AdbDevice, AdbError } from "@azurauto/adb";

export type BootstrapPhase =
	| "idle"
	| "checking-adb"
	| "adb-recovering"
	| "no-adb"
	| "no-device"
	| "checking-atx"
	| "installing-atx"
	| "ready"
	| "failed";

export type BootstrapErrorCode =
	| "ADB_NOT_AVAILABLE"
	| "ADB_TIMEOUT"
	| "ADB_SERVER_FAILED"
	| "NO_DEVICE"
	| "DEVICE_UNAUTHORIZED"
	| "DEVICE_OFFLINE"
	| "ATX_NOT_INSTALLED"
	| "ATX_INSTALLER_MISSING"
	| "ATX_INSTALL_FAILED"
	| "UNKNOWN";

export type BootstrapStatus = {
	phase: BootstrapPhase;
	serial?: string;
	message: string;
	recoverable: boolean;
	nextAction?: string;
	errorCode?: BootstrapErrorCode;
	updatedAt: string;
};

export type ScreenshotFrame = {
	serial: string;
	mimeType: "image/jpeg" | "image/png";
	data: Uint8Array;
	capturedAt: string;
};

export type ScreenshotSource = {
	capture(serial: string): Promise<{
		mimeType: ScreenshotFrame["mimeType"];
		data: Buffer;
	}>;
	shutdown?(serial?: string): Promise<void>;
	dispose?(): Promise<void>;
};

export type AtxInstallStrategy = {
	packageName: string;
	apkPath?: string;
	install(adb: AdbClient, serial: string): Promise<void>;
};

export type DeviceBootstrapServiceOptions = {
	adb?: AdbClient;
	atx?: AtxInstallStrategy;
	screenshotSource?: ScreenshotSource;
	onStatusChange?: (status: BootstrapStatus) => void;
};

const DEFAULT_ATX_PACKAGE = "com.github.uiautomator";

export function createDefaultAtxInstallStrategy(
	apkPath = process.env.AZURAUTO_ATX_APK_PATH,
	packageName = DEFAULT_ATX_PACKAGE,
): AtxInstallStrategy {
	return {
		packageName,
		async install(adb, serial) {
			if (!apkPath || !existsSync(apkPath)) {
				throw new DeviceBootstrapError(
					"ATX_INSTALLER_MISSING",
					"未找到 ATX 安装包，请配置 AZURAUTO_ATX_APK_PATH 或随应用打包安装资源。",
					true,
				);
			}

			await adb.installApk(serial, apkPath);
		},
	};
}

export class DeviceBootstrapError extends Error {
	readonly code: BootstrapErrorCode;
	readonly recoverable: boolean;

	constructor(code: BootstrapErrorCode, message: string, recoverable: boolean) {
		super(message);
		this.name = "DeviceBootstrapError";
		this.code = code;
		this.recoverable = recoverable;
	}
}

/**
 * 设备启动检查服务负责把“找设备 → 检查 ATX → 自动安装 → 再次验证”串成单一状态机。
 * Electron 主进程只创建并调用该服务，后续截图自动化和脚本运行可统一检查 ready 状态。
 */
export class DeviceBootstrapService {
	private readonly adb: AdbClient;
	private readonly atx: AtxInstallStrategy;
	private readonly screenshotSource: ScreenshotSource;
	private readonly onStatusChange?: (status: BootstrapStatus) => void;
	private status = createStatus("idle", "等待检查 ADB 和 ATX 环境。", true);
	private running?: Promise<BootstrapStatus>;

	constructor(options: DeviceBootstrapServiceOptions = {}) {
		this.adb = options.adb ?? new AdbClient();
		this.atx = options.atx ?? createDefaultAtxInstallStrategy();
		this.screenshotSource =
			options.screenshotSource ?? new Uiautomator2ScreenshotSource(this.adb);
		this.onStatusChange = options.onStatusChange;
	}

	getStatus() {
		return this.status;
	}

	async captureScreenshot(): Promise<ScreenshotFrame> {
		const { serial } = this.requireReadyDevice();
		const image = await this.screenshotSource.capture(serial);

		return {
			serial,
			mimeType: image.mimeType,
			data: image.data,
			capturedAt: new Date().toISOString(),
		};
	}

	async shutdown() {
		const serial = this.status.serial;
		try {
			await (this.screenshotSource.shutdown?.(serial) ?? this.screenshotSource.dispose?.());
		} catch {
			// swallow cleanup errors
		}

		try {
			await this.adb.killServer?.();
		} catch {
			// swallow cleanup errors
		}
	}

	dispose() {
		return this.shutdown();
	}

	async run() {
		// 防止用户连续点击“重试”导致多个安装流程同时写入同一台设备。
		if (this.running) {
			return this.running;
		}

		this.running = this.runInternal().finally(() => {
			this.running = undefined;
		});

		return this.running;
	}

	private async runInternal() {
		try {
			this.setStatus(
				createStatus("checking-adb", "正在检查 ADB 和已连接的模拟器。", false),
			);

			const adb = this.adb as AdbClient & {
				listDevicesWithRecovery?: (options?: {
					onRecoveryStart?: () => void;
					resetServerBeforeCheck?: boolean;
				}) => Promise<AdbDevice[]>;
			};
			const devices = adb.listDevicesWithRecovery
				? await adb.listDevicesWithRecovery({
						resetServerBeforeCheck: true,
						onRecoveryStart: () => {
							this.setStatus(
								createStatus(
									"adb-recovering",
									"正在重启 AzurAuto 专用 ADB 服务后重新检查设备。",
									false,
								),
							);
						},
					})
				: await adb.listDevices();
			const device = selectTargetDevice(devices);

			this.setStatus(
				createStatus(
					"checking-atx",
					"已发现设备，正在检查 ATX 自动化组件。",
					false,
					{
						serial: device.serial,
					},
				),
			);

			if (
				await this.adb.isPackageInstalled(device.serial, this.atx.packageName)
			) {
				return this.setStatus(
					createStatus("ready", "ADB 设备和 ATX 自动化组件已就绪。", false, {
						serial: device.serial,
					}),
				);
			}

			this.setStatus(
				createStatus("installing-atx", "设备缺少 ATX，正在自动安装。", false, {
					serial: device.serial,
				}),
			);

			await this.atx.install(this.adb, device.serial);

			// 安装后必须再次检测，避免把“命令执行成功”误判为“设备能力可用”。
			if (
				await this.adb.isPackageInstalled(device.serial, this.atx.packageName)
			) {
				return this.setStatus(
					createStatus("ready", "ATX 安装完成，自动化环境已就绪。", false, {
						serial: device.serial,
					}),
				);
			}

			throw new DeviceBootstrapError(
				"ATX_INSTALL_FAILED",
				"ATX 安装后仍未检测到，请检查安装包或设备权限。",
				true,
			);
		} catch (error) {
			return this.setStatus(toFailureStatus(error));
		}
	}

	private setStatus(status: BootstrapStatus) {
		this.status = status;
		this.onStatusChange?.(status);
		return status;
	}

	private requireReadyDevice() {
		if (this.status.phase !== "ready" || !this.status.serial) {
			throw new DeviceBootstrapError(
				"NO_DEVICE",
				"自动化环境未就绪，无法获取实时截图。",
				true,
			);
		}

		return { serial: this.status.serial };
	}
}

export type Uiautomator2ScreenshotSourceOptions = {
	jsonRpcPort?: number;
	localPort?: number;
	jarPath?: string;
	requestTimeoutMs?: number;
};

export class Uiautomator2ScreenshotSource implements ScreenshotSource {
	private static readonly deviceJarPath = "/data/local/tmp/u2.jar";
	private static readonly deviceLogPath = "/data/local/tmp/azurauto-u2.log";
	private static readonly devicePidPath = "/data/local/tmp/azurauto-u2.pid";
	private readonly jsonRpcPort: number;
	private localPort: number;
	private readonly jarPath?: string;
	private readonly requestTimeoutMs: number;
	private forwardedSerial?: string;

	constructor(
		private readonly adb: AdbClient,
		options: Uiautomator2ScreenshotSourceOptions = {},
	) {
		this.jsonRpcPort = options.jsonRpcPort ?? 9008;
		this.localPort =
			options.localPort ?? Number(process.env.AZURAUTO_U2_LOCAL_PORT ?? 19008);
		this.jarPath = options.jarPath;
		this.requestTimeoutMs = options.requestTimeoutMs ?? 3000;
	}

	async capture(serial: string): Promise<{
		mimeType: ScreenshotFrame["mimeType"];
		data: Buffer;
	}> {
		await this.ensureJsonRpcServer(serial);
		const base64 = await this.requestJsonRpc<string>("takeScreenshot", [1, 80]);

		return {
			mimeType: base64.startsWith("iVBOR") ? "image/png" : "image/jpeg",
			data: Buffer.from(base64, "base64"),
		};
	}

	async shutdown(serial?: string) {
		const targetSerial = serial ?? this.forwardedSerial;
		if (!targetSerial) return;
		try {
			await this.stopJsonRpcServer(targetSerial);
		} catch {
			// swallow cleanup errors
		}
	}

	dispose() {
		return this.shutdown();
	}

	private async ensureJsonRpcServer(serial: string) {
		if (this.forwardedSerial === serial) {
			try {
				await this.pingJsonRpc();
				return;
			} catch {
				this.forwardedSerial = undefined;
			}
		}

		for (let offset = 0; offset < 10; offset += 1) {
			const localPort = this.localPort + offset;

			try {
				await this.adb.forward(
					serial,
					`tcp:${localPort}`,
					`tcp:${this.jsonRpcPort}`,
				);
				this.forwardedSerial = serial;
				this.localPort = localPort;
				break;
			} catch {
				if (offset === 9) {
					throw new DeviceBootstrapError(
						"UNKNOWN",
						"uiautomator2 端口转发失败，请检查本地端口是否被占用。",
						true,
					);
				}
			}
		}

		if (!(await this.canConnectJsonRpc())) {
			await this.startJsonRpcServer(serial);
			await this.waitForJsonRpc(serial);
		}
	}

	private async startJsonRpcServer(serial: string) {
		await this.stopJsonRpcServer(serial);
		await this.ensureUiautomator2Jar(serial);

		// 设备端 u2.jar 准备完成后，启动 JSON-RPC server。
		await this.adb.shell(
			serial,
			`rm -f ${Uiautomator2ScreenshotSource.deviceLogPath} ${Uiautomator2ScreenshotSource.devicePidPath}; (trap '' HUP; echo $$ >${Uiautomator2ScreenshotSource.devicePidPath}; exec >>${Uiautomator2ScreenshotSource.deviceLogPath} 2>&1; echo '[azurauto] starting uiautomator2 json-rpc server'; export CLASSPATH=${Uiautomator2ScreenshotSource.deviceJarPath}; exec app_process / com.wetest.uia2.Main) >/dev/null 2>&1 &`,
		);
	}

	private async stopJsonRpcServer(serial: string) {
		await this.adb.shell(
			serial,
			`pid=$(cat ${Uiautomator2ScreenshotSource.devicePidPath} 2>/dev/null || true); if [ -n "$pid" ]; then kill "$pid" 2>/dev/null || true; fi; for pid in $(pidof app_process 2>/dev/null); do tr '\\0' ' ' < /proc/$pid/cmdline | grep -q 'com.wetest.uia2.Main' && kill $pid; done >/dev/null 2>&1 || true`,
		);
	}

	private async ensureUiautomator2Jar(serial: string) {
		if (this.jarPath && existsSync(this.jarPath)) {
			await this.adb.pushFile(
				serial,
				this.jarPath,
				Uiautomator2ScreenshotSource.deviceJarPath,
			);
			return;
		}

		if (this.jarPath && !existsSync(this.jarPath)) {
			throw new DeviceBootstrapError(
				"UNKNOWN",
				`未找到 uiautomator2 u2.jar：${this.jarPath}。请重新准备应用资源后再启动。`,
				true,
			);
		}

		const result = await this.adb.shell(
			serial,
			`test -f ${Uiautomator2ScreenshotSource.deviceJarPath} && echo present || echo missing`,
		);
		if (result.stdout.trim() === "present") {
			return;
		}

		if (!this.jarPath || !existsSync(this.jarPath)) {
			throw new DeviceBootstrapError(
				"UNKNOWN",
				"未找到 uiautomator2 u2.jar，请重新准备应用资源后再启动。",
				true,
			);
		}

		await this.adb.pushFile(serial, this.jarPath, "/data/local/tmp/u2.jar");
	}

	private async waitForJsonRpc(serial: string) {
		for (let attempt = 0; attempt < 50; attempt += 1) {
			try {
				if (await this.pingJsonRpc()) {
					return;
				}
			} catch {
				await new Promise((resolve) => setTimeout(resolve, 200));
			}
		}

		const diagnostics = await this.readJsonRpcServerDiagnostics(serial);

		throw new DeviceBootstrapError(
			"UNKNOWN",
			`uiautomator2 JSON-RPC 服务启动失败。设备端诊断：${diagnostics || "未读取到诊断信息，请确认设备连接状态。"}`,
			true,
		);
	}

	private async readJsonRpcServerDiagnostics(serial: string) {
		try {
			const result = await this.adb.shell(
				serial,
				`pid=$(cat ${Uiautomator2ScreenshotSource.devicePidPath} 2>/dev/null || true); printf 'pid='; printf '%s' "$pid"; printf '\ncmdline='; if [ -n "$pid" ]; then tr '\\0' ' ' < /proc/$pid/cmdline 2>/dev/null || true; fi; printf '\nprocess='; ps -A | grep -E 'app_process|com.wetest.uia2' || true; printf '\nport='; netstat -an 2>/dev/null | grep ':${this.jsonRpcPort}' || true; printf '\nlog='; cat ${Uiautomator2ScreenshotSource.deviceLogPath} 2>/dev/null || true`,
			);
			return result.stdout.trim().slice(-1200);
		} catch {
			return "";
		}
	}

	private async canConnectJsonRpc() {
		try {
			return await this.pingJsonRpc();
		} catch {
			return false;
		}
	}

	private async pingJsonRpc() {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);

		try {
			const response = await fetch(`http://127.0.0.1:${this.localPort}/ping`, {
				signal: controller.signal,
			});
			return response.ok && (await response.text()) === "pong";
		} finally {
			clearTimeout(timer);
		}
	}

	private async requestJsonRpc<Result>(method: string, params: unknown) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);

		try {
			const response = await fetch(
				`http://127.0.0.1:${this.localPort}/jsonrpc/0`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
					signal: controller.signal,
				},
			);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const payload = (await response.json()) as {
				result?: Result;
				error?: { message?: string };
			};

			if (payload.error || payload.result === undefined) {
				throw new Error(payload.error?.message ?? "Missing JSON-RPC result");
			}

			return payload.result;
		} catch {
			throw new DeviceBootstrapError(
				"UNKNOWN",
				"uiautomator2 截图请求失败，请确认 u2.jar 已初始化且设备端服务可启动。",
				true,
			);
		} finally {
			clearTimeout(timer);
		}
	}
}

export function selectTargetDevice(devices: AdbDevice[]) {
	const readyDevice = devices.find((device) => device.state === "device");

	if (readyDevice) {
		return readyDevice;
	}

	const unauthorized = devices.find(
		(device) => device.state === "unauthorized",
	);
	if (unauthorized) {
		throw new DeviceBootstrapError(
			"DEVICE_UNAUTHORIZED",
			"设备未授权，请在模拟器或手机上确认 ADB 授权。",
			true,
		);
	}

	const offline = devices.find((device) => device.state === "offline");
	if (offline) {
		throw new DeviceBootstrapError(
			"DEVICE_OFFLINE",
			"设备处于 offline 状态，请重启模拟器或重新连接设备。",
			true,
		);
	}

	throw new DeviceBootstrapError(
		"NO_DEVICE",
		"未发现可用 ADB 设备，请先打开模拟器。",
		true,
	);
}

function toFailureStatus(error: unknown) {
	if (error instanceof DeviceBootstrapError) {
		if (error.code === "NO_DEVICE") {
			return createStatus("no-device", error.message, true, {
				errorCode: error.code,
				nextAction: "打开模拟器后点击重试。",
			});
		}

		if (
			error.code === "DEVICE_UNAUTHORIZED" ||
			error.code === "DEVICE_OFFLINE"
		) {
			return createStatus("no-device", error.message, true, {
				errorCode: error.code,
				nextAction: "修复设备连接或授权后点击重试。",
			});
		}

		return createStatus("failed", error.message, error.recoverable, {
			errorCode: error.code,
			nextAction: "修复 ATX 安装配置后点击重试。",
		});
	}

	if (error instanceof AdbError && error.code === "ADB_NOT_AVAILABLE") {
		return createStatus(
			"no-adb",
			"未找到 ADB，请安装 Android platform-tools 并配置 PATH。",
			true,
			{
				errorCode: "ADB_NOT_AVAILABLE",
				nextAction: "安装或配置 ADB 后点击重试。",
			},
		);
	}

	if (error instanceof AdbError && error.code === "ADB_TIMEOUT") {
		return createStatus("failed", "ADB 响应超时，请重启模拟器或 ADB 服务后重试。", true, {
			errorCode: "ADB_TIMEOUT",
			nextAction: "可先点击重新检查；如果仍无设备，再点击重启 ADB 服务。",
		});
	}

	if (error instanceof AdbError && error.code === "ADB_SERVER_FAILED") {
		return createStatus("failed", "ADB 服务启动或重启失败。", true, {
			errorCode: "ADB_SERVER_FAILED",
			nextAction: "确认 adb 可执行文件可用，且没有其他工具阻塞 ADB 服务。",
		});
	}

	return createStatus("failed", "环境检查失败，请查看日志后重试。", true, {
		errorCode: "UNKNOWN",
		nextAction: "修复问题后点击重试。",
	});
}

function createStatus(
	phase: BootstrapPhase,
	message: string,
	recoverable: boolean,
	extra: Partial<
		Omit<BootstrapStatus, "phase" | "message" | "recoverable" | "updatedAt">
	> = {},
): BootstrapStatus {
	return {
		phase,
		message,
		recoverable,
		updatedAt: new Date().toISOString(),
		...extra,
	};
}
