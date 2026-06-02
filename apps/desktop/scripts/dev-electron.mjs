import { spawn } from "node:child_process";
import electron from "electron";
import { createServer } from "vite";

const server = await createServer({
	server: {
		port: 3000,
		strictPort: false,
	},
});

await server.listen();
server.printUrls();

const rendererUrl = server.resolvedUrls?.local[0];

if (!rendererUrl) {
	throw new Error("Failed to resolve Vite dev server URL.");
}

const child = spawn(electron, ["./electron/main.ts"], {
	stdio: "inherit",
	env: {
		...process.env,
		ELECTRON_RENDERER_URL: rendererUrl,
	},
});

async function cleanup() {
	child.kill("SIGTERM");
	await server.close();
}

child.on("close", async (code) => {
	await server.close();
	process.exit(code ?? 0);
});

process.on("SIGINT", async () => {
	await cleanup();
	process.exit(130);
});

process.on("SIGTERM", async () => {
	await cleanup();
	process.exit(143);
});
