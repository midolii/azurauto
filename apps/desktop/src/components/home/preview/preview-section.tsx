import type { BootstrapStatus } from "@azurauto/automation";
import { useCallback, useState } from "react";

import { useDesktopStore } from "#/stores/desktop-store.ts";
import { StatusItem } from "../status-item";
import { useScrcpyPreview } from "./hooks/use-scrcpy-preview";
import { useUiautomator2Preview } from "./hooks/use-uiautomator2-preview";
import { SCRCPY_FPS_OPTIONS, SCRCPY_RESOLUTION_OPTIONS } from "./utils/options";

export function PreviewSection({ status }: { status: BootstrapStatus | null }) {
	const runtime = useDesktopStore((state) => state.runtime);
	const [uiautomatorFps, setUiautomatorFps] = useState(0);
	const [scrcpyFps, setScrcpyFps] = useState(0);
	const [streamError, setStreamError] = useState<string | null>(null);

	const handleUiautomatorFps = useCallback(
		(nextFps: number) => setUiautomatorFps(nextFps),
		[],
	);
	const handleScrcpyFps = useCallback(
		(nextFps: number) => setScrcpyFps(nextFps),
		[],
	);
	const handleError = useCallback((message: string | null) => {
		setStreamError(message);
	}, []);
	const ignoreUiautomatorStop = useCallback(() => undefined, []);

	const isUiautomatorStreaming =
		runtime.screenshotCaptureRunning && status?.phase === "ready";
	const { frame, frameUrl } = useUiautomator2Preview({
		previewSource: "uiautomator2",
		isStreaming: isUiautomatorStreaming,
		status,
		onFps: handleUiautomatorFps,
		onError: handleError,
		onStop: ignoreUiautomatorStop,
	});
	const scrcpy = useScrcpyPreview({
		previewSource: "scrcpy",
		onFps: handleScrcpyFps,
		onError: handleError,
	});

	return (
		<div className="flex flex-col gap-6">
			<section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
				<div className="space-y-2">
					<span className="inline-flex rounded-full bg-cyan-500/15 px-3 py-1 text-cyan-300 text-sm">
						uiautomator2
					</span>
					<h2 className="font-semibold text-lg">实时截图输入</h2>
					<p className="text-slate-400 text-sm">
						脚本启动后会自动请求 uiautomator 截图，用于后续 OCR 识别逻辑。
					</p>
				</div>

				<div className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
					{frameUrl ? (
						<img
							alt="Android device live screenshot"
							className="mx-auto max-h-155 w-full object-contain"
							src={frameUrl}
						/>
					) : (
						<div className="flex min-h-80 items-center justify-center p-8 text-center text-slate-500">
							{runtime.screenshotCaptureRunning
								? "正在等待 uiautomator 截图帧..."
								: "点击侧边栏顶部启动按钮后，这里会自动显示 uiautomator 实时截图。"}
						</div>
					)}
				</div>

				<div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
					<StatusItem
						label="截图状态"
						value={isUiautomatorStreaming ? "运行中" : "已停止"}
					/>
					<StatusItem
						label="截图设备"
						value={frame?.serial ?? status?.serial ?? "-"}
					/>
					<StatusItem label="实时 FPS" value={String(uiautomatorFps)} />
					<StatusItem
						label="最新帧时间"
						value={frame ? new Date(frame.capturedAt).toLocaleString() : "-"}
					/>
				</div>
			</section>

			<section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="space-y-2">
						<span className="inline-flex rounded-full bg-violet-500/15 px-3 py-1 text-sm text-violet-300">
							scrcpy
						</span>
						<h2 className="font-semibold text-lg">手动视频预览</h2>
						<p className="text-slate-400 text-sm">
							scrcpy 用于低延迟人工调试预览，不会随脚本启动自动开启。
						</p>
					</div>

					<div className="flex flex-wrap gap-2">
						<label className="flex items-center gap-2 rounded-lg bg-slate-950/70 px-3 py-2 text-slate-300 text-sm">
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
						<label className="flex items-center gap-2 rounded-lg bg-slate-950/70 px-3 py-2 text-slate-300 text-sm">
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
							className="cursor-pointer rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950 text-sm active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
							disabled={status?.phase !== "ready" || scrcpy.isScrcpyBusy}
							onClick={scrcpy.toggleScrcpyPreview}
						>
							{scrcpy.scrcpyStatus?.running ? "停止 scrcpy" : "启动 scrcpy"}
						</button>
					</div>
				</div>

				<div className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
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
				</div>

				<div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
					<StatusItem
						label="预览状态"
						value={scrcpy.scrcpyStatus?.running ? "运行中" : "已停止"}
					/>
					<StatusItem
						label="预览设备"
						value={scrcpy.scrcpyStatus?.serial ?? status?.serial ?? "-"}
					/>
					<StatusItem label="实时 FPS" value={String(scrcpyFps)} />
					<StatusItem
						label="scrcpy 配置"
						value={`${scrcpy.scrcpyMaxFps} FPS / ${scrcpy.scrcpyMaxSize === 0 ? "原始" : `${scrcpy.scrcpyMaxSize}p`}`}
					/>
				</div>

				{scrcpy.scrcpyStatus ? (
					<div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-violet-100">
						{scrcpy.scrcpyStatus.message}
					</div>
				) : null}
			</section>

			{streamError ? (
				<div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-100 text-sm">
					{streamError}
				</div>
			) : null}
		</div>
	);
}
