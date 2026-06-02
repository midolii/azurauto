export {};

import type { BotApi } from "../../electron/preload/index.ts";

declare global {
	interface Window {
		bot: BotApi;
	}
}
