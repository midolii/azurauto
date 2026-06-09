import type {
	EnvironmentApi,
	LoggerApi,
	RuntimeApi,
	ScrcpyApi,
} from "../../electron/preload/index.ts";

declare global {
	interface Window {
		environment: EnvironmentApi;
		logger: LoggerApi;
		runtime: RuntimeApi;
		scrcpy: ScrcpyApi;
	}
}
