import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { buildNitroConfig } from "./vite.config/nitro";
import { createPlugins } from "./vite.config/plugins";

const resolveConfig = { tsconfigPaths: true };

export default defineConfig(({ command }) => {
	const plugins = createPlugins();
	const isBuild = command === "build";

	return {
		resolve: resolveConfig,
		...(isBuild ? { nitro: buildNitroConfig } : {}),
		plugins: [...plugins, ...(isBuild ? [nitro()] : [])],
	};
});
