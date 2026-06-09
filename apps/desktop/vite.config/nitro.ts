import type { Nitro, NitroConfig, RollupConfig } from "nitro/types";

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

export const buildNitroConfig: NitroConfig = {
	renderer: {
		handler: "./electron/nitro/ssr-renderer.ts",
	},
	rollupConfig: nitroRollupConfig,
	hooks: nitroHooks,
};
