import type {
	ScrcpyMediaStreamPacket,
	ScrcpyVideoCodecId,
} from "@yume-chan/scrcpy";
import {
	BitmapVideoFrameRenderer,
	WebCodecsVideoDecoder,
	WebGLVideoFrameRenderer,
} from "@yume-chan/scrcpy-decoder-webcodecs";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ScrcpyPreviewStatus } from "../../../../../electron/ipc/contract.ts";
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
	const scrcpyCanvasHostRef = useRef<HTMLDivElement | null>(null);
	const scrcpyDecoderRef = useRef<WebCodecsVideoDecoder | null>(null);
	const scrcpyWriterRef =
		useRef<WritableStreamDefaultWriter<ScrcpyMediaStreamPacket> | null>(null);

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
			const nextStatus = await window.scrcpy.getPreviewStatus();
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
	}, []);

	useEffect(() => {
		let frames = 0;
		let fpsStartedAt = performance.now();

		const unsubscribe = window.scrcpy.onVideoEvent(async (event) => {
			try {
				if (event.type === "metadata") {
					const host = scrcpyCanvasHostRef.current;
					if (!host) {
						return;
					}

					await resetScrcpyDecoder();
					host.replaceChildren();

					if (!WebCodecsVideoDecoder.isSupported) {
						onError(
							"当前 Electron WebContents 不支持 WebCodecs，无法内嵌 scrcpy。",
						);
						return;
					}

					const renderer = WebGLVideoFrameRenderer.isSupported
						? new WebGLVideoFrameRenderer()
						: new BitmapVideoFrameRenderer();
					renderer.setSize(event.metadata.width, event.metadata.height);
					const canvas = renderer.canvas as HTMLCanvasElement;
					canvas.className =
						"mx-auto h-full max-h-[620px] w-full object-contain";
					host.appendChild(canvas);
					setIsScrcpyCanvasReady(true);

					const decoder = new WebCodecsVideoDecoder({
						codec: event.metadata.codec as ScrcpyVideoCodecId,
						renderer,
						hardwareAcceleration: "no-preference",
					});
					scrcpyDecoderRef.current = decoder;
					scrcpyWriterRef.current = decoder.writable.getWriter();
					onError(null);
					return;
				}

				if (event.type === "packet") {
					await scrcpyWriterRef.current?.write(
						event.packet as ScrcpyMediaStreamPacket,
					);
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
			setScrcpyStatus(
				scrcpyStatus?.running
					? await window.scrcpy.stopPreview()
					: await window.scrcpy.startPreview({
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
		scrcpyCanvasHostRef,
		toggleScrcpyPreview,
	};
}
