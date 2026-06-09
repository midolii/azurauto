import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const scrcpyServerVersion = "3.3.3";
const fetchPackageDir = dirname(
	require.resolve("@yume-chan/fetch-scrcpy-server/package.json"),
);
const serverPath = join(fetchPackageDir, "server.bin");
const versionPath = join(fetchPackageDir, "version.js");
const fetchCliPath = join(fetchPackageDir, "bin", "fetch-server.js");

// 仅当 @yume-chan/fetch-scrcpy-server 包内缺少目标版本 server.bin 时才下载，避免 build:app 重复拉取 3.3.3。
if (await hasExpectedScrcpyServer()) {
	console.log(
		`Using cached scrcpy-server ${scrcpyServerVersion}: ${serverPath}`,
	);
} else {
	await fetchScrcpyServer();
}

async function hasExpectedScrcpyServer() {
	if (!(await fileExists(serverPath))) {
		return false;
	}

	const installedVersion = await readInstalledVersion();

	return installedVersion === scrcpyServerVersion;
}

async function readInstalledVersion() {
	if (!(await fileExists(versionPath))) {
		return undefined;
	}

	const source = await readFile(versionPath, "utf8");
	const match = source.match(/VERSION\s*=\s*['"]([^'"]+)['"]/);

	return match?.[1];
}

function fetchScrcpyServer() {
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [fetchCliPath, scrcpyServerVersion], {
			stdio: "inherit",
		});

		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) {
				resolve();
				return;
			}

			reject(new Error(`fetch-scrcpy-server exited with code ${code}.`));
		});
	});
}

async function fileExists(path) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}
