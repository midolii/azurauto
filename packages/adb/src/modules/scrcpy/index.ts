import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { AdbServerClient } from "@yume-chan/adb";
import { AdbScrcpyClient, AdbScrcpyOptionsLatest } from "@yume-chan/adb-scrcpy";
import { AdbServerNodeTcpConnector } from "@yume-chan/adb-server-node-tcp";
import {
	DefaultServerPath,
	type ScrcpyMediaStreamPacket,
	type ScrcpyVideoCodecId,
} from "@yume-chan/scrcpy";
import {
	ReadableStream as YumeReadableStream,
	type ReadableStream as YumeReadableStreamType,
} from "@yume-chan/stream-extra";

const require = createRequire(import.meta.url);

// scrcpy 子模块封装 @yume-chan 的 ADB/scrcpy 协议能力。
// 它只返回视频 metadata 与 packet stream，不负责 Electron IPC 或 renderer 解码。

export type EmbeddedScrcpyVideoMetadata = {
	codec: ScrcpyVideoCodecId;
	width: number;
	height: number;
};

export type EmbeddedScrcpyVideoPacket = ScrcpyMediaStreamPacket;

export type EmbeddedScrcpySession = {
	metadata: EmbeddedScrcpyVideoMetadata;
	stream: YumeReadableStreamType<EmbeddedScrcpyVideoPacket>;
};

export type EmbeddedScrcpyOptions = {
	adbHost?: string;
	adbPort?: number;
	serverPath?: string;
	maxFps?: number;
	maxSize?: number;
	videoBitRate?: number;
};

export type EmbeddedScrcpyStartOptions = Pick<
	EmbeddedScrcpyOptions,
	"maxFps" | "maxSize" | "videoBitRate"
>;

/**
 * @yume-chan/scrcpy native 适配层。
 * packages/adb 统一拥有 ADB server 连接、scrcpy server 推送和设备侧进程生命周期；
 * Electron 主进程只编排 IPC，不直接依赖第三方 native ADB API。
 */
export class EmbeddedScrcpyClient {
	#client: AdbScrcpyClient<AdbScrcpyOptionsLatest<true>> | undefined;
	readonly #options: Required<EmbeddedScrcpyOptions>;

	constructor(options: EmbeddedScrcpyOptions = {}) {
		this.#options = {
			adbHost: options.adbHost ?? "127.0.0.1",
			adbPort: options.adbPort ?? 5037,
			serverPath: options.serverPath ?? getFetchedScrcpyServerPath(),
			maxFps: options.maxFps ?? 60,
			maxSize: options.maxSize ?? 0,
			videoBitRate: options.videoBitRate ?? 8_000_000,
		};
	}

	get running() {
		return Boolean(this.#client);
	}

	async start(
		serial: string,
		startOptions: EmbeddedScrcpyStartOptions = {},
	): Promise<EmbeddedScrcpySession> {
		if (this.#client) {
			throw new Error("scrcpy preview is already running.");
		}

		const serverBinary = await this.#loadServerBinary();
		const adbServer = new AdbServerClient(
			new AdbServerNodeTcpConnector({
				host: this.#options.adbHost,
				port: this.#options.adbPort,
			}),
		);
		const adb = await adbServer.createAdb({ serial });

		// 每次启动前推送 server，保证设备重启、临时目录清理后可恢复。
		await AdbScrcpyClient.pushServer(
			adb,
			new YumeReadableStream({
				start(controller) {
					controller.enqueue(serverBinary);
					controller.close();
				},
			}),
			DefaultServerPath,
		);

		const options = new AdbScrcpyOptionsLatest({
			video: true,
			audio: false,
			control: false,
			videoCodec: "h264",
			videoBitRate: startOptions.videoBitRate ?? this.#options.videoBitRate,
			maxFps: startOptions.maxFps ?? this.#options.maxFps,
			maxSize: startOptions.maxSize ?? this.#options.maxSize,
			tunnelForward: false,
			logLevel: "info",
		});

		this.#client = await AdbScrcpyClient.start(adb, DefaultServerPath, options);
		const video = await this.#client.videoStream;

		return {
			metadata: {
				codec: video.metadata.codec,
				width: video.width,
				height: video.height,
			},
			stream: video.stream,
		};
	}

	async stop() {
		const client = this.#client;
		this.#client = undefined;
		await client?.close();
	}

	async #loadServerBinary() {
		// serverPath 在开发模式来自 resources/android，打包后来自 process.resourcesPath/android。
		// 这里仅验证并读取二进制，资源解析由 desktop 层负责。
		if (!existsSync(this.#options.serverPath)) {
			throw new Error(
				`未找到 scrcpy server：${this.#options.serverPath}。请执行 pnpm --filter desktop resources（或 pnpm --filter @azurauto/adb fetch:scrcpy-server），也可以设置 AZURAUTO_SCRCPY_SERVER_PATH。`,
			);
		}

		return new Uint8Array(await readFile(this.#options.serverPath));
	}
}

export function getFetchedScrcpyServerPath() {
	const packageJsonPath = require.resolve(
		"@yume-chan/fetch-scrcpy-server/package.json",
	);
	return join(dirname(packageJsonPath), "server.bin");
}
