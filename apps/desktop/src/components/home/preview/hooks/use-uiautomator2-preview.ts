import type { BootstrapStatus, ScreenshotFrame } from "@azurauto/automation";
import { useEffect, useRef, useState } from "react";
import type { PreviewSource } from "../utils/options";

export function useUiautomator2Preview({
	previewSource,
	isStreaming,
	status,
	onFps,
	onError,
	onStop,
}: {
	previewSource: PreviewSource;
	isStreaming: boolean;
	status: BootstrapStatus | null;
	onFps(fps: number): void;
	onError(message: string | null): void;
	onStop(): void;
}) {
	const [frame, setFrame] = useState<ScreenshotFrame | null>(null);
	const [frameUrl, setFrameUrl] = useState<string | null>(null);
	const frameUrlRef = useRef<string | null>(null);

	useEffect(() => {
		if (
			previewSource !== "uiautomator2" ||
			!isStreaming ||
			status?.phase !== "ready"
		) {
			return;
		}

		let cancelled = false;
		let frames = 0;
		let fpsStartedAt = performance.now();

		async function captureLoop() {
			// 不使用 setInterval：上一帧完成并渲染后，立即请求下一帧，避免请求堆积。
			while (!cancelled) {
				try {
					const nextFrame = await window.environment.captureScreenshot();
					if (!cancelled) {
						setFrame(nextFrame);
						const nextUrl = URL.createObjectURL(
							new Blob([new Uint8Array(nextFrame.data)], {
								type: nextFrame.mimeType,
							}),
						);
						if (frameUrlRef.current) {
							URL.revokeObjectURL(frameUrlRef.current);
						}
						frameUrlRef.current = nextUrl;
						setFrameUrl(nextUrl);

						frames += 1;
						const now = performance.now();
						if (now - fpsStartedAt >= 1000) {
							onFps(Math.round((frames * 1000) / (now - fpsStartedAt)));
							frames = 0;
							fpsStartedAt = now;
						}

						onError(null);
					}
				} catch (error) {
					if (!cancelled) {
						onError(
							error instanceof Error ? error.message : "获取截图失败，请重试。",
						);
						onStop();
					}
					break;
				}

				await new Promise((resolve) => requestAnimationFrame(resolve));
			}
		}

		void captureLoop();

		return () => {
			cancelled = true;
		};
	}, [isStreaming, onError, onFps, onStop, previewSource, status?.phase]);

	useEffect(() => {
		return () => {
			if (frameUrlRef.current) {
				URL.revokeObjectURL(frameUrlRef.current);
			}
		};
	}, []);

	return { frame, frameUrl };
}
