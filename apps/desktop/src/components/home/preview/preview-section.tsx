import type { BootstrapStatus } from "@azurauto/automation";
import { useCallback, useState } from "react";
import { StatusItem } from "../status-item";
import { useScrcpyPreview } from "./hooks/use-scrcpy-preview";
import { useUiautomator2Preview } from "./hooks/use-uiautomator2-preview";
import {
	type PreviewSource,
	SCRCPY_FPS_OPTIONS,
	SCRCPY_RESOLUTION_OPTIONS,
} from "./utils/options";

export function PreviewSection({ status }: { status: BootstrapStatus | null }) {
	const [isStreaming, setIsStreaming] = useState(false);
	const [previewSource, setPreviewSource] =
		useState<PreviewSource>("uiautomator2");
	const [fps, setFps] = useState(0);
	const [streamError, setStreamError] = useState<string | null>(null);

	const handleFps = useCallback((nextFps: number) => setFps(nextFps), []);
	const handleError = useCallback((message: string | null) => {
		setStreamError(message);
	}, []);
	const stopUiautomator2 = useCallback(() => setIsStreaming(false), []);

	const { frame, frameUrl } = useUiautomator2Preview({
		previewSource,
		isStreaming,
		status,
		onFps: handleFps,
		onError: handleError,
		onStop: stopUiautomator2,
	});
	const scrcpy = useScrcpyPreview({
		previewSource,
		onFps: handleFps,
		onError: handleError,
	});

	const canStream = status?.phase === "ready";
	const isUiautomator2Source = previewSource === "uiautomator2";

	function selectPreviewSource(source: PreviewSource) {
		setPreviewSource(source);
		setIsStreaming(false);
		setStreamError(null);
	}

	return (
		<section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="space-y-2">
					<span className="inline-flex rounded-full bg-violet-500/15 px-3 py-1 text-sm text-violet-300">
						实时预览
					</span>
					<h2 className="text-lg font-semibold">模拟器实时画面</h2>
					<p className="text-sm text-slate-400">
						scrcpy 用于低延迟预览；uiautomator2
						保留给自动化识别，并按上一帧完成后请求下一帧。
					</p>
				</div>

				<div className="flex flex-wrap gap-2">
					<label className="flex items-center gap-2 rounded-lg bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
						<span className="text-slate-500">FPS</span>
						<select
							className="bg-transparent text-slate-100 outline-none disabled:text-slate-500"
							disabled={scrcpy.scrcpyStatus?.running || scrcpy.isScrcpyBusy}
							value={scrcpy.scrcpyMaxFps}
							onChange={(event) =>
								scrcpy.setScrcpyMaxFps(Number(event.currentTarget.value))
							}
						>
							{SCRCPY_FPS_OPTIONS.map((value) => (
								<option key={value} value={value}>
									{value}
								</option>
							))}
						</select>
					</label>
					<label className="flex items-center gap-2 rounded-lg bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
						<span className="text-slate-500">分辨率</span>
						<select
							className="bg-transparent text-slate-100 outline-none disabled:text-slate-500"
							disabled={scrcpy.scrcpyStatus?.running || scrcpy.isScrcpyBusy}
							value={scrcpy.scrcpyMaxSize}
							onChange={(event) =>
								scrcpy.setScrcpyMaxSize(Number(event.currentTarget.value))
							}
						>
							{SCRCPY_RESOLUTION_OPTIONS.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</label>
					<button
						type="button"
						className={`rounded-lg px-4 py-2 text-sm font-medium ${previewSource === "scrcpy" ? "bg-violet-500 text-white" : "bg-slate-800 text-slate-300"}`}
						onClick={() => selectPreviewSource("scrcpy")}
					>
						scrcpy
					</button>
					<button
						type="button"
						className={`rounded-lg px-4 py-2 text-sm font-medium ${previewSource === "uiautomator2" ? "bg-violet-500 text-white" : "bg-slate-800 text-slate-300"}`}
						onClick={() => selectPreviewSource("uiautomator2")}
					>
						uiautomator2
					</button>
					<button
						type="button"
						className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
						disabled={!canStream || scrcpy.isScrcpyBusy}
						onClick={
							isUiautomator2Source
								? () => setIsStreaming((current) => !current)
								: scrcpy.toggleScrcpyPreview
						}
					>
						{isUiautomator2Source
							? isStreaming
								? "停止截图流"
								: "开始截图流"
							: scrcpy.scrcpyStatus?.running
								? "停止 scrcpy"
								: "启动 scrcpy"}
					</button>
				</div>
			</div>

			<div className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
				{isUiautomator2Source && frameUrl ? (
					<img
						alt="Android device live screenshot"
						className="mx-auto max-h-155 w-full object-contain"
						src={frameUrl}
					/>
				) : previewSource === "scrcpy" ? (
					<div className="relative min-h-80 p-4">
						<div
							ref={scrcpy.scrcpyCanvasHostRef}
							className="flex min-h-80 items-center justify-center"
						/>
						{scrcpy.isScrcpyCanvasReady ? null : (
							<div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8 text-center text-slate-400">
								{scrcpy.scrcpyStatus?.running
									? "正在等待 scrcpy 视频帧..."
									: "点击“启动 scrcpy”后，画面会通过 @yume-chan/scrcpy + WebCodecs 内嵌到此区域。"}
							</div>
						)}
					</div>
				) : (
					<div className="flex min-h-80 items-center justify-center p-8 text-center text-slate-500">
						{canStream
							? "点击“开始截图流”查看 uiautomator2 截图效果。"
							: "等待 ADB/ATX 环境 ready 后可开启截图流。"}
					</div>
				)}
			</div>

			<div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
				<StatusItem
					label="预览来源"
					value={previewSource === "scrcpy" ? "scrcpy" : "uiautomator2"}
				/>
				<StatusItem
					label="预览状态"
					value={
						previewSource === "scrcpy"
							? scrcpy.scrcpyStatus?.running
								? "运行中"
								: "已停止"
							: isStreaming
								? "运行中"
								: "已停止"
					}
				/>
				<StatusItem
					label="截图设备"
					value={frame?.serial ?? status?.serial ?? "-"}
				/>
				<StatusItem label="FPS" value={String(fps)} />
				<StatusItem
					label="scrcpy 配置"
					value={`${scrcpy.scrcpyMaxFps} FPS / ${scrcpy.scrcpyMaxSize === 0 ? "原始" : `${scrcpy.scrcpyMaxSize}p`}`}
				/>
				<StatusItem
					label="最新帧时间"
					value={frame ? new Date(frame.capturedAt).toLocaleString() : "-"}
				/>
			</div>

			{previewSource === "scrcpy" && scrcpy.scrcpyStatus ? (
				<div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-violet-100">
					{scrcpy.scrcpyStatus.message}
				</div>
			) : null}

			{streamError ? (
				<div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
					{streamError}
				</div>
			) : null}
		</section>
	);
}
