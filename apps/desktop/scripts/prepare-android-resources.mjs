import { spawn } from "node:child_process";
import {
  access,
  chmod,
  copyFile,
  mkdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import extract from "extract-zip";

const require = createRequire(import.meta.url);
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const resourcesDir = join(rootDir, "resources", "android");
const downloadsDir = join(rootDir, ".resource-cache");

const platformToolsUrls = {
  darwin:
    "https://dl.google.com/android/repository/platform-tools-latest-darwin.zip",
  win32:
    "https://dl.google.com/android/repository/platform-tools-latest-windows.zip",
  linux:
    "https://dl.google.com/android/repository/platform-tools-latest-linux.zip",
};
const uiautomator2JarUrl =
  "https://public.uiauto.devsleep.com/u2jar/0.2.2/u2.jar";

const platformKey = process.platform;
const platformToolsUrl = platformToolsUrls[platformKey];
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

if (!platformToolsUrl) {
  throw new Error(
    `Unsupported platform for Android platform-tools: ${platformKey}`,
  );
}

await mkdir(resourcesDir, { recursive: true });
await mkdir(downloadsDir, { recursive: true });

await prepareScrcpyServer();
await prepareUiautomator2Jar();
await preparePlatformTools();
await writeResourceManifest();

console.log(`Prepared Android resources in ${resourcesDir}`);

async function prepareScrcpyServer() {
  const target = join(resourcesDir, "scrcpy-server.bin");
  if (await fileExists(target)) {
    console.log(`Using cached Android resource: ${target}`);
    return;
  }

  // build:app 不再每次强制 fetch；只有本地资源缺失时才补齐 scrcpy-server 包缓存。
  await ensureScrcpyServerPackageCache();
  const source = getScrcpyServerPackagePath();

  await copyFile(source, target);
}

async function ensureScrcpyServerPackageCache() {
  if (await fileExists(getScrcpyServerPackagePath())) {
    return;
  }

  await runCommand(pnpmCommand, [
    "--filter",
    "@azurauto/adb",
    "fetch:scrcpy-server",
  ]);
}

function getScrcpyServerPackagePath() {
  return join(
    dirname(require.resolve("@yume-chan/fetch-scrcpy-server/package.json")),
    "server.bin",
  );
}

async function prepareUiautomator2Jar() {
  const target = join(resourcesDir, "u2.jar");
  if (await fileExists(target)) {
    console.log(`Using cached Android resource: ${target}`);
    return;
  }

  await downloadFile(uiautomator2JarUrl, target);
}

async function preparePlatformTools() {
  const zipPath = join(downloadsDir, basename(platformToolsUrl));
  const extractDir = join(downloadsDir, `platform-tools-${platformKey}`);
  const targetDir = join(resourcesDir, "platform-tools", platformKey);
  const targetAdb = join(
    targetDir,
    platformKey === "win32" ? "adb.exe" : "adb",
  );

  if (await fileExists(targetAdb)) {
    console.log(`Using cached Android resource: ${targetAdb}`);
    return;
  }

  await downloadFileIfMissing(platformToolsUrl, zipPath);
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

async function downloadFileIfMissing(url, target) {
  if (await fileExists(target)) {
    console.log(`Using cached download: ${target}`);
    return;
  }

  await downloadFile(url, target);
}

function runCommand(command, args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { stdio: "inherit" });

    child.on("error", rejectRun);
    child.on("close", (code) => {
      if (code === 0) {
        resolveRun();
        return;
      }

      rejectRun(
        new Error(`${command} ${args.join(" ")} exited with code ${code}.`),
      );
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
