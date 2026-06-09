import type {
	EnvironmentApi,
	RuntimeApi,
	ScrcpyApi,
} from "../../electron/preload/index.ts";

declare global {
	interface Window {
		environment: EnvironmentApi;
		runtime: RuntimeApi;
		scrcpy: ScrcpyApi;
	}
}
