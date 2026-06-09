import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { codeInspectorPlugin } from "code-inspector-plugin";
import type { PluginOption } from "vite";

export function createPlugins(): PluginOption[] {
	return [
		tailwindcss(),
		// TanStack Start owns the renderer dev server; React must be registered after it.
		// Nitro 只参与生产构建，避免开发模式返回 .output 的 /assets/* 产物路径。
		tanstackStart({ router: { routeFileIgnorePattern: "^~" } }),
		codeInspectorPlugin({
			bundler: "vite",
			showSwitch: true,
			behavior: {
				locate: true,
				copy: true,
			},
			launchType: "open",
		}),
		viteReact(),
	];
}
