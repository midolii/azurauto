import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import type { Nitro, NitroConfig, RollupConfig } from "nitro/types";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

type RollupOutputWithGeneratedCode = {
	generatedCode?: unknown;
};

const nitroRollupConfig = {
	checks: {
		preferBuiltinFeature: false,
	},
} as unknown as NitroConfig["rollupConfig"];

const nitroHooks: NonNullable<NitroConfig["hooks"]> = {
	"rollup:before": (_nitro: Nitro, rollupConfig: RollupConfig) => {
		const outputs = Array.isArray(rollupConfig.output)
			? rollupConfig.output
			: [rollupConfig.output];

		for (const output of outputs) {
			delete (output as RollupOutputWithGeneratedCode).generatedCode;
		}
	},
};

const buildNitroConfig: NitroConfig = {
	renderer: {
		entry: "./electron/nitro/ssr-renderer.ts",
	},
	rollupConfig: nitroRollupConfig,
	hooks: nitroHooks,
};

const config = defineConfig(({ command }) => {
	const plugins = [
		devtools(),
		tailwindcss(),
		// TanStack Start owns the renderer dev server; React must be registered after it.
		// Nitro 只参与生产构建，避免开发模式返回 .output 的 /assets/* 产物路径。
		tanstackStart(),
		viteReact(),
	];

	if (command === "build") {
		return {
			resolve: { tsconfigPaths: true },
			nitro: buildNitroConfig,
			plugins: [...plugins, nitro()],
		};
	}

	return {
		resolve: { tsconfigPaths: true },
		plugins,
	};
});

export default config;
