import {
	buildPreload,
	buildRenderer,
	buildWorkspaceDependencies,
	cleanRendererBuildOutput,
	log,
	packageElectronApp,
	prepareAndroidResources,
} from "./shared.mjs";

const target = process.argv[2] ?? "web";

// 单一 build 入口：package.json 只传 target，具体步骤顺序在这里维护。
// 这样 dev/build/build:app 可以复用 shared.mjs 的日志、命令执行和路径配置。
switch (target) {
	case "deps":
		await buildWorkspaceDependencies();
		break;
	case "preload":
		await buildPreload();
		break;
	case "renderer":
	case "web:only":
		await buildRenderer();
		break;
	case "web":
		await buildPreload();
		await buildRenderer();
		break;
	case "resources":
		await prepareAndroidResources();
		break;
	case "clean":
		await cleanRendererBuildOutput();
		break;
	case "app":
		// 完整桌面包：先保证依赖和 native 资源，再构建 renderer，最后交给 electron-builder。
		await buildWorkspaceDependencies();
		await prepareAndroidResources();
		await buildPreload();
		await buildRenderer();
		await packageElectronApp();
		break;
	default:
		printUsageAndExit();
}

log(`build target completed: ${target}`);

function printUsageAndExit() {
	console.error(
		[
			"Usage: node ./build/build.mjs <target>",
			"Targets:",
			"  deps       Build workspace dependencies used by Electron",
			"  preload    Build Electron preload bundle",
			"  renderer   Clean and build renderer only",
			"  web        Build preload + renderer",
			"  resources  Prepare Android native resources",
			"  clean      Clean renderer output directories",
			"  app        Build deps/resources/preload/renderer and package app",
			"",
			"Package aliases:",
			"  pnpm resources       -> resources",
			"  pnpm build           -> web",
			"  pnpm build:app       -> app",
		].join("\n"),
	);
	process.exit(1);
}
