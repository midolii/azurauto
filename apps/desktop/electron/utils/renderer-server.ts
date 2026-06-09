import { type ChildProcess, spawn } from "node:child_process";
import { createConnection, createServer } from "node:net";
import { join } from "node:path";
import type { App } from "electron";

const RENDERER_HOST = "localhost";
const RENDERER_READY_TIMEOUT_MS = 10_000;

/**
 * Manages the renderer URL used by BrowserWindow.
 * 管理 BrowserWindow 使用的渲染进程 URL。
 *
 * Development: receives the Vite URL from scripts/dev-electron.mjs via
 * ELECTRON_RENDERER_URL, so the port can change when 3000 is occupied.
 * 开发环境：通过 ELECTRON_RENDERER_URL 接收 scripts/dev-electron.mjs 启动的 Vite URL，
 * 因此 3000 被占用时也可以自动切换端口。
 *
 * Production: starts the built TanStack/Nitro server from .output/server and
 * returns the local URL Electron should load.
 * 生产环境：从 .output/server 启动构建后的 TanStack/Nitro server，并返回 Electron 要加载的本地 URL。
 */
export class RendererServerManager {
	#app: App;
	#serverProcess: ChildProcess | null = null;

	constructor(app: App) {
		this.#app = app;
	}

	async getRendererUrl() {
		if (process.env.ELECTRON_RENDERER_URL) {
			console.log(
				"Using Vite renderer URL:",
				process.env.ELECTRON_RENDERER_URL,
			);
			return process.env.ELECTRON_RENDERER_URL;
		}

		if (!this.#app.isPackaged) {
			throw new Error(
				"Missing ELECTRON_RENDERER_URL in development. Start desktop with `pnpm --filter desktop dev` so Electron loads the active Vite dev server instead of a stale localhost:3000 process.",
			);
		}

		return this.#startPackagedRendererServer();
	}

	stop() {
		this.#serverProcess?.kill("SIGTERM");
		this.#serverProcess = null;
	}

	#getRendererServerEntry() {
		return this.#app.isPackaged
			? join(process.resourcesPath, ".output/server/index.mjs")
			: join(this.#app.getAppPath(), ".output/server/index.mjs");
	}

	async #startPackagedRendererServer() {
		const port = await getAvailablePort();
		const url = `http://${RENDERER_HOST}:${port}`;

		this.#serverProcess = spawn(
			process.execPath,
			[this.#getRendererServerEntry()],
			{
				stdio: "inherit",
				env: {
					...process.env,
					// Run the bundled Electron binary as Node to execute Nitro's server entry.
					// 将打包后的 Electron 二进制作为 Node 运行，用来执行 Nitro server 入口。
					ELECTRON_RUN_AS_NODE: "1",
					HOST: RENDERER_HOST,
					PORT: String(port),
				},
			},
		);

		await waitForPort(port);

		return url;
	}
}

/**
 * Ask the OS for a free local port.
 * 向操作系统申请一个空闲本地端口。
 */
function getAvailablePort() {
	return new Promise<number>((resolve, reject) => {
		const server = createServer();

		server.listen(0, RENDERER_HOST, () => {
			const address = server.address();

			server.close(() => {
				if (typeof address === "object" && address) {
					resolve(address.port);
					return;
				}

				reject(new Error("Failed to find available renderer port."));
			});
		});

		server.on("error", reject);
	});
}

/**
 * Wait until the local renderer server accepts TCP connections.
 * 等待本地渲染进程 server 可以接受 TCP 连接。
 */
function waitForPort(port: number) {
	return new Promise<void>((resolve, reject) => {
		const startedAt = Date.now();

		function check() {
			const socket = createConnection({ host: RENDERER_HOST, port });

			socket.once("error", () => {
				if (Date.now() - startedAt > RENDERER_READY_TIMEOUT_MS) {
					reject(
						new Error(`Timed out waiting for renderer server on port ${port}.`),
					);
					return;
				}

				setTimeout(check, 200);
			});

			socket.once("connect", () => {
				socket.end();
				resolve();
			});
		}

		check();
	});
}
