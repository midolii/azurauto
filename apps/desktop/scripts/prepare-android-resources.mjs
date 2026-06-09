import { chmod, copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import extract from "extract-zip";

const require = createRequire(import.meta.url);
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const resourcesDir = join(rootDir, "resources", "android");
const downloadsDir = join(rootDir, ".resource-cache");

const platformToolsUrls = {
	darwin: "https://dl.google.com/android/repository/platform-tools-latest-darwin.zip",
	win32: "https://dl.google.com/android/repository/platform-tools-latest-windows.zip",
	linux: "https://dl.google.com/android/repository/platform-tools-latest-linux.zip",
};

const platformKey = process.platform;
const platformToolsUrl = platformToolsUrls[platformKey];

if (!platformToolsUrl) {
	throw new Error(`Unsupported platform for Android platform-tools: ${platformKey}`);
}

await mkdir(resourcesDir, { recursive: true });
await mkdir(downloadsDir, { recursive: true });

await prepareScrcpyServer();
await preparePlatformTools();
await writeResourceManifest();

console.log(`Prepared Android resources in ${resourcesDir}`);

async function prepareScrcpyServer() {
	const source = join(
		dirname(require.resolve("@yume-chan/fetch-scrcpy-server/package.json")),
		"server.bin",
	);
	const target = join(resourcesDir, "scrcpy-server.bin");

	await copyFile(source, target);
}

async function preparePlatformTools() {
	const zipPath = join(downloadsDir, basename(platformToolsUrl));
	const extractDir = join(downloadsDir, `platform-tools-${platformKey}`);
	const targetDir = join(resourcesDir, "platform-tools", platformKey);

	await downloadFile(platformToolsUrl, zipPath);
	await rm(extractDir, { recursive: true, force: true });
	await mkdir(extractDir, { recursive: true });
	await extract(zipPath, { dir: extractDir });
	await rm(targetDir, { recursive: true, force: true });
	await mkdir(dirname(targetDir), { recursive: true });
	await copyDirectory(join(extractDir, "platform-tools"), targetDir);

	if (platformKey !== "win32") {
		await chmod(join(targetDir, "adb"), 0o755);
	}
}

async function downloadFile(url, target) {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
	}

	await writeFile(target, Buffer.from(await response.arrayBuffer()));
}

async function copyDirectory(source, target) {
	await rm(target, { recursive: true, force: true });
	await mkdir(target, { recursive: true });
	const { cp } = await import("node:fs/promises");
	await cp(source, target, { recursive: true });
}

async function writeResourceManifest() {
	await writeFile(
		join(resourcesDir, "manifest.json"),
		`${JSON.stringify(
			{
				platform: platformKey,
				generatedAt: new Date().toISOString(),
				resources: {
					adb: `platform-tools/${platformKey}/${platformKey === "win32" ? "adb.exe" : "adb"}`,
					scrcpyServer: "scrcpy-server.bin",
					uiautomator2Jar: "u2.jar",
					atxApk: "atx-agent.apk",
				},
			},
			null,
			2,
		)}\n`,
	);
}
