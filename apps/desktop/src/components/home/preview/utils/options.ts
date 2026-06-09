export type PreviewSource = "scrcpy" | "uiautomator2";

export const SCRCPY_FPS_OPTIONS = [30, 45, 60, 90, 120] as const;

export const SCRCPY_RESOLUTION_OPTIONS = [
	{ label: "原始分辨率", value: 0 },
	{ label: "720p", value: 720 },
	{ label: "1080p", value: 1080 },
	{ label: "1440p", value: 1440 },
] as const;
