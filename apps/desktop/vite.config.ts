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

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		devtools(),
		tailwindcss(),
		tanstackStart(),
		nitro({
			config: {
				renderer: {
					entry: "./electron/nitro/ssr-renderer.ts",
				},
				rollupConfig: nitroRollupConfig,
				hooks: nitroHooks,
			},
		}),
		viteReact(),
	],
});

export default config;
