import type {
	EnvironmentApi,
	ScrcpyApi,
} from "../../electron/preload/index.ts";

declare global {
	interface Window {
		environment: EnvironmentApi;
		scrcpy: ScrcpyApi;
	}
}
