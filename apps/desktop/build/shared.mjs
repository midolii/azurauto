import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

const buildDir = dirname(fileURLToPath(import.meta.url));

export const desktopRoot = resolve(buildDir, "..");
export const workspaceRoot = resolve(desktopRoot, "../..");
export const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const preloadEntry = resolve(desktopRoot, "electron/preload/index.ts");
const preloadOutfile = resolve(desktopRoot, "electron/preload/dist/index.cjs");
const electronBuilderConfig = resolve(buildDir, "electron-builder.config.cjs");

export function log(message) {
	console.log(`[desktop-build] ${message}`);
}

// 给每个构建阶段统一打印开始/结束/耗时，方便定位卡在哪个步骤。
export async function withStep(label, task) {
	const startedAt = Date.now();
	log(`▶ ${label}`);

	try {
		const result = await task();
		log(`✓ ${label} (${formatDuration(startedAt)})`);
		return result;
	} catch (error) {
		log(`✖ ${label} failed (${formatDuration(startedAt)})`);
		throw error;
	}
}

export function runCommand(label, command, args, options = {}) {
	return withStep(label, () => spawnAndWait(command, args, options));
}

export function runPnpm(label, args, options = {}) {
	return runCommand(label, pnpmCommand, args, options);
}

// dev 和 build:app 都需要先构建工作区依赖，否则 Electron 主进程会加载到旧 dist。
export async function buildWorkspaceDependencies() {
	await runPnpm("Build @azurauto/adb", ["--filter", "@azurauto/adb", "build"], {
		cwd: workspaceRoot,
	});
	await runPnpm(
		"Build @azurauto/automation",
		["--filter", "@azurauto/automation", "build"],
		{ cwd: workspaceRoot },
	);
}

export async function buildPreload() {
	await withStep("Build Electron preload", async () => {
		await mkdir(dirname(preloadOutfile), { recursive: true });
		await esbuild({
			entryPoints: [preloadEntry],
			bundle: true,
			outfile: preloadOutfile,
			platform: "node",
			format: "cjs",
			target: "node22",
			external: ["electron"],
			sourcemap: true,
		});
		log(`preload output: ${preloadOutfile}`);
	});
}

// TanStack/Nitro 构建产物在 .output/.nitro；每次生产构建前清理，避免旧 assets hash 残留。
export async function cleanRendererBuildOutput() {
	await withStep("Clean renderer build output", async () => {
		await Promise.all([
			rm(resolve(desktopRoot, ".output"), { recursive: true, force: true }),
			rm(resolve(desktopRoot, ".nitro"), { recursive: true, force: true }),
			rm(resolve(desktopRoot, "node_modules", ".nitro"), {
				recursive: true,
				force: true,
			}),
		]);
	});
}

export async function buildRenderer() {
	await cleanRendererBuildOutput();
	await runPnpm("Build renderer", ["exec", "vite", "build"], {
		cwd: desktopRoot,
	});
}

export async function prepareAndroidResources() {
	await runCommand(
		"Prepare Android resources",
		process.execPath,
		[resolve(desktopRoot, "scripts/prepare-android-resources.mjs")],
		{ cwd: desktopRoot },
	);
}

export async function packageElectronApp() {
	await runPnpm(
		"Package Electron app",
		["exec", "electron-builder", "--config", electronBuilderConfig],
		{ cwd: desktopRoot },
	);
}

// dev 模式下 Electron 是长驻进程，不能用 runCommand 等待完成，否则无法处理关闭流程。
export function spawnLongRunning(command, args, options = {}) {
	log(`▶ ${[command, ...args].join(" ")}`);

	return spawn(command, args, {
		cwd: options.cwd ?? desktopRoot,
		stdio: options.stdio ?? "inherit",
		env: { ...process.env, ...options.env },
	});
}

function spawnAndWait(command, args, options = {}) {
	return new Promise((resolveRun, rejectRun) => {
		const child = spawn(command, args, {
			cwd: options.cwd ?? desktopRoot,
			stdio: options.stdio ?? "inherit",
			env: { ...process.env, ...options.env },
		});

		child.on("error", rejectRun);
		child.on("close", (code) => {
			if (code === 0) {
				resolveRun();
				return;
			}

			rejectRun(new Error(`${command} ${args.join(" ")} exited with code ${code}.`));
		});
	});
}

function formatDuration(startedAt) {
	return `${Date.now() - startedAt}ms`;
}
