import electron from "electron";
import { createServer } from "vite";
import {
	buildPreload,
	buildWorkspaceDependencies,
	desktopRoot,
	log,
	spawnLongRunning,
	withStep,
} from "./shared.mjs";

const skipSetup = process.argv.includes("--skip-setup");

// 默认 dev 会先刷新 workspace 依赖和 preload；dev:electron 用 --skip-setup 只重启 Electron。
if (!skipSetup) {
	await buildWorkspaceDependencies();
	await buildPreload();
} else {
	log("skip setup: reuse existing dependency/preload build outputs");
}

const { rendererUrl, server } = await startRendererDevServer();
const electronProcess = spawnLongRunning(electron, ["./electron/main.ts"], {
	cwd: desktopRoot,
	env: { ELECTRON_RENDERER_URL: rendererUrl },
});

let isShuttingDown = false;

electronProcess.on("close", async (code) => {
	await shutdown(code ?? 0);
});

process.on("SIGINT", async () => {
	electronProcess.kill("SIGTERM");
	await shutdown(130);
});

process.on("SIGTERM", async () => {
	electronProcess.kill("SIGTERM");
	await shutdown(143);
});

async function startRendererDevServer() {
	return withStep("Start Vite renderer dev server", async () => {
		const server = await createServer({
			server: {
				port: 3000,
				// Electron 必须加载本脚本启动的 Vite server；严格端口可避免误连旧进程。
				strictPort: true,
			},
		});

		await server.listen();
		server.printUrls();

		const rendererUrl = server.resolvedUrls?.local[0];
		if (!rendererUrl) {
			throw new Error("Failed to resolve Vite dev server URL.");
		}

		log(`renderer URL: ${rendererUrl}`);

		return { rendererUrl, server };
	});
}

async function shutdown(exitCode) {
	if (isShuttingDown) {
		return;
	}

	isShuttingDown = true;
	// Electron 退出时同步关闭 Vite，避免旧 dev server 占用 3000 后造成页面资源错连。
	await withStep("Stop Vite renderer dev server", () => server.close());
	process.exit(exitCode);
}
