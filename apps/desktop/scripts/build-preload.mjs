import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const entry = resolve(rootDir, "electron/preload/index.ts");
const outfile = resolve(rootDir, "electron/preload/dist/index.cjs");

await mkdir(dirname(outfile), { recursive: true });

await build({
	entryPoints: [entry],
	bundle: true,
	outfile,
	platform: "node",
	format: "cjs",
	target: "node22",
	external: ["electron"],
	sourcemap: true,
});

console.log(`Built preload: ${outfile}`);
