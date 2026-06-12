import { useCallback, useEffect, useRef, useState } from "react";
import { desktopPlatform, type PlatformCapability } from "#/platform/index.ts";
import {
	createScrcpyRenderer,
	createScrcpyVideoDecoder,
	getScrcpyPacketWriter,
	getScrcpyVideoDecoderCapability,
	type ScrcpyVideoDecoder,
} from "#/platform/scrcpy-video.ts";
import type {
	ScrcpyPreviewStatus,
	ScrcpyVideoPacket,
} from "../../../../../electron/ipc/contract/index.ts";
import type { PreviewSource } from "../utils/options";

export function useScrcpyPreview({
	previewSource,
	onFps,
	onError,
}: {
	previewSource: PreviewSource;
	onFps(fps: number): void;
	onError(message: string | null): void;
}) {
	const [scrcpyStatus, setScrcpyStatus] = useState<ScrcpyPreviewStatus | null>(
		null,
	);
	const [isScrcpyBusy, setIsScrcpyBusy] = useState(false);
	const [scrcpyMaxFps, setScrcpyMaxFps] = useState(60);
	const [scrcpyMaxSize, setScrcpyMaxSize] = useState(1080);
	const [isScrcpyCanvasReady, setIsScrcpyCanvasReady] = useState(false);
	const [scrcpyCapability, setScrcpyCapability] = useState<PlatformCapability>(
		() => desktopPlatform.getCapabilities().scrcpy,
	);
	const [videoDecoderCapability, setVideoDecoderCapability] =
		useState<PlatformCapability>(() => getScrcpyVideoDecoderCapability());
	const scrcpyCanvasHostRef = useRef<HTMLDivElement | null>(null);
	const scrcpyDecoderRef = useRef<ScrcpyVideoDecoder | null>(null);
	const scrcpyWriterRef =
		useRef<WritableStreamDefaultWriter<ScrcpyVideoPacket> | null>(null);

	const refreshCapabilities = useCallback(() => {
		setScrcpyCapability(desktopPlatform.getCapabilities().scrcpy);
		setVideoDecoderCapability(getScrcpyVideoDecoderCapability());
	}, []);

	const resetScrcpyDecoder = useCallback(async () => {
		const writer = scrcpyWriterRef.current;
		const decoder = scrcpyDecoderRef.current;
		scrcpyWriterRef.current = null;
		scrcpyDecoderRef.current = null;

		try {
			await writer?.close();
		} catch {
			// 解码器重置时流可能已被主进程关闭，忽略重复关闭错误。
		}

		decoder?.dispose();
		scrcpyCanvasHostRef.current?.replaceChildren();
		setIsScrcpyCanvasReady(false);
	}, []);

	useEffect(() => {
		let cancelled = false;

		async function loadScrcpyStatus() {
			refreshCapabilities();
			const nextStatus = await desktopPlatform.scrcpy.getPreviewStatus();
			if (!cancelled) {
				setScrcpyStatus(nextStatus);
			}
		}

		void loadScrcpyStatus();
		const timer = window.setInterval(loadScrcpyStatus, 1000);

		return () => {
			cancelled = true;
			window.clearInterval(timer);
		};
	}, [refreshCapabilities]);

	useEffect(() => {
		if (desktopPlatform.getCapabilities().scrcpy.status !== "available") {
			return;
		}

		let frames = 0;
		let fpsStartedAt = performance.now();

		const unsubscribe = desktopPlatform.scrcpy.onVideoEvent(async (event) => {
			try {
				if (event.type === "metadata") {
					const host = scrcpyCanvasHostRef.current;
					if (!host) {
						return;
					}

					await resetScrcpyDecoder();
					host.replaceChildren();

					const nextDecoderCapability = getScrcpyVideoDecoderCapability();
					setVideoDecoderCapability(nextDecoderCapability);
					if (nextDecoderCapability.status !== "available") {
						onError(nextDecoderCapability.message);
						return;
					}

					const renderer = createScrcpyRenderer();
					renderer.setSize(event.metadata.width, event.metadata.height);
					const canvas = renderer.canvas as HTMLCanvasElement;
					canvas.className = "mx-auto h-full max-h-155 w-full object-contain";
					host.appendChild(canvas);
					setIsScrcpyCanvasReady(true);

					const decoder = createScrcpyVideoDecoder({
						codec: event.metadata.codec,
						renderer,
					});
					scrcpyDecoderRef.current = decoder;
					scrcpyWriterRef.current = getScrcpyPacketWriter(decoder);
					onError(null);
					return;
				}

				if (event.type === "packet") {
					await scrcpyWriterRef.current?.write(event.packet);
					frames += 1;
					const now = performance.now();
					if (now - fpsStartedAt >= 1000) {
						onFps(Math.round((frames * 1000) / (now - fpsStartedAt)));
						frames = 0;
						fpsStartedAt = now;
					}
					return;
				}

				if (event.type === "error") {
					onError(event.message);
					await resetScrcpyDecoder();
					return;
				}

				await resetScrcpyDecoder();
			} catch (error) {
				onError(
					error instanceof Error ? error.message : "scrcpy 视频解码失败。",
				);
				await resetScrcpyDecoder();
			}
		});

		return () => {
			unsubscribe();
			onFps(0);
			void resetScrcpyDecoder();
		};
	}, [onError, onFps, resetScrcpyDecoder]);

	useEffect(() => {
		if (previewSource !== "scrcpy") {
			void resetScrcpyDecoder();
		}
	}, [previewSource, resetScrcpyDecoder]);

	async function toggleScrcpyPreview() {
		setIsScrcpyBusy(true);
		try {
			const nextScrcpyCapability = desktopPlatform.getCapabilities().scrcpy;
			setScrcpyCapability(nextScrcpyCapability);
			const nextDecoderCapability = getScrcpyVideoDecoderCapability();
			setVideoDecoderCapability(nextDecoderCapability);

			if (nextScrcpyCapability.status !== "available") {
				onError(nextScrcpyCapability.message);
				setScrcpyStatus(await desktopPlatform.scrcpy.getPreviewStatus());
				return;
			}

			if (
				!scrcpyStatus?.running &&
				nextDecoderCapability.status !== "available"
			) {
				onError(nextDecoderCapability.message);
				return;
			}

			if (scrcpyStatus?.running) {
				onFps(0);
			}
			setScrcpyStatus(
				scrcpyStatus?.running
					? await desktopPlatform.scrcpy.stopPreview()
					: await desktopPlatform.scrcpy.startPreview({
							maxFps: scrcpyMaxFps,
							maxSize: scrcpyMaxSize,
						}),
			);
		} catch (error) {
			onError(error instanceof Error ? error.message : "scrcpy 预览启动失败。");
		} finally {
			setIsScrcpyBusy(false);
		}
	}

	return {
		scrcpyStatus,
		isScrcpyBusy,
		scrcpyMaxFps,
		setScrcpyMaxFps,
		scrcpyMaxSize,
		setScrcpyMaxSize,
		isScrcpyCanvasReady,
		scrcpyCapability,
		videoDecoderCapability,
		scrcpyCanvasHostRef,
		toggleScrcpyPreview,
	};
}
