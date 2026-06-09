import type { EnvironmentApi } from "../../electron/preload/index.ts";

declare global {
	interface Window {
		environment: EnvironmentApi;
	}
}
