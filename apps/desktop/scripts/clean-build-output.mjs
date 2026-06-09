import { rm } from "node:fs/promises";
import { join, resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");

await Promise.all([
	rm(join(rootDir, ".output"), { recursive: true, force: true }),
	rm(join(rootDir, ".nitro"), { recursive: true, force: true }),
	rm(join(rootDir, "node_modules", ".nitro"), { recursive: true, force: true }),
]);
