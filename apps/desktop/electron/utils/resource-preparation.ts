import { copyFile, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import type { AndroidResources } from "./android-resources.ts";

export type StartupResourcePhase = "checking" | "downloading" | "ready" | "failed";

export type StartupResourceStatus = {
	phase: StartupResourcePhase;
	message: string;
	ready: boolean;
	missing: string[];
	warnings: string[];
	updatedAt: string;
};

const require = createRequire(import.meta.url);
const UIAUTOMATOR2_JAR_URL = "https://public.uiauto.devsleep.com/u2jar/0.2.2/u2.jar";
const DOWNLOAD_TIMEOUT_MS = 30_000;

export class ResourcePreparationService {
	private readonly resources: AndroidResources;
	private status = createResourceStatus(
		"checking",
		"正在检查本地自动化资源。",
		false,
	);
	private running?: Promise<StartupResourceStatus>;

	constructor(resources: AndroidResources) {
		this.resources = resources;
	}

	getStatus() {
		return this.status;
	}

	private setStatus(status: StartupResourceStatus) {
		this.status = status;
		return status;
	}

	async prepare() {
		if (this.running) {
			return this.running;
		}

		this.running = this.prepareInternal().finally(() => {
			this.running = undefined;
		});

		return this.running;
	}

	private async prepareInternal() {
		try {
			this.setStatus(
				createResourceStatus("checking", "正在检查本地自动化资源。", false),
			);

			await mkdir(this.resources.root, { recursive: true });
			await this.prepareScrcpyServer();
			await this.prepareUiautomator2Jar();

			const missing = getMissingResources(this.resources);
			const blocking = missing.filter((name) =>
				["scrcpy-server", "uiautomator2"].includes(name),
			);
			const warnings = missing.filter((name) => !blocking.includes(name));

			if (blocking.length > 0) {
				return this.setStatus(
					createResourceStatus(
						"failed",
						`缺少必要资源：${blocking.join("、")}。`,
						false,
						blocking,
						warnings,
					),
				);
			}

			return this.setStatus(
				createResourceStatus(
					"ready",
					warnings.length > 0
						? `本地资源已准备，部分运行时资源需在启动脚本前配置：${warnings.join("、")}。`
						: "本地自动化资源已准备完成。",
					true,
					[],
					warnings,
				),
			);
		} catch (error) {
			return this.setStatus(
				createResourceStatus(
					"failed",
					error instanceof Error ? error.message : "本地资源准备失败。",
					false,
				),
			);
		}
	}

	private async prepareScrcpyServer() {
		if (this.resources.scrcpyServerPath) {
			return;
		}

		this.setStatus(
			createResourceStatus("downloading", "正在准备 scrcpy-server 资源。", false),
		);
		const source = join(
			dirname(require.resolve("@yume-chan/fetch-scrcpy-server/package.json")),
			"server.bin",
		);
		const target = join(this.resources.root, "scrcpy-server.bin");
		await copyFile(source, `${target}.tmp`);
		await rename(`${target}.tmp`, target);
		this.resources.scrcpyServerPath = target;
	}

	private async prepareUiautomator2Jar() {
		if (this.resources.uiautomator2JarPath) {
			return;
		}

		this.setStatus(
			createResourceStatus("downloading", "正在下载 uiautomator2 截图资源。", false),
		);
		const target = join(this.resources.root, "u2.jar");
		await downloadFile(UIAUTOMATOR2_JAR_URL, target);
		this.resources.uiautomator2JarPath = target;
	}
}

function getMissingResources(resources: AndroidResources): string[] {
	return (
		[
		["adb", resources.adbPath],
		["scrcpy-server", resources.scrcpyServerPath],
		["uiautomator2", resources.uiautomator2JarPath],
		["atx-agent", resources.atxApkPath],
	] satisfies Array<[string, string | undefined]>)
		.filter(([, path]) => !path || !existsSync(path))
		.map(([name]) => name);
}

async function downloadFile(url: string, target: string) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
	const tmp = `${target}.tmp`;

	try {
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) {
			throw new Error(`下载资源失败：HTTP ${response.status}`);
		}

		await writeFile(tmp, Buffer.from(await response.arrayBuffer()));
		await rename(tmp, target);
	} finally {
		clearTimeout(timeout);
		await rm(tmp, { force: true }).catch(() => undefined);
	}
}

function createResourceStatus(
	phase: StartupResourcePhase,
	message: string,
	ready: boolean,
	missing: string[] = [],
	warnings: string[] = [],
): StartupResourceStatus {
	return {
		phase,
		message,
		ready,
		missing,
		warnings,
		updatedAt: new Date().toISOString(),
	};
}
