import type { BootstrapStatus } from "@azurauto/automation";
import { useCallback, useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select.tsx";

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
			<section className="rounded-xl bg-white/82 p-5 shadow-sm ring-1 ring-slate-200">
				<div className="space-y-2">
					<span className="inline-flex rounded-md border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700 text-sm">
						uiautomator2
					</span>
					<h2 className="font-semibold text-lg text-slate-950">实时截图输入</h2>
					<p className="text-slate-600 text-sm">
						脚本启动后会自动请求 uiautomator 截图，用于后续 OCR 识别逻辑。
					</p>
				</div>

				<div className="mt-5 aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
					{frameUrl ? (
						<img
							alt="Android device live screenshot"
							className="mx-auto max-h-155 w-full object-contain"
							src={frameUrl}
						/>
					) : (
						<div className="flex h-full items-center justify-center p-8 text-center text-slate-500">
							{runtime.screenshotCaptureRunning
								? "正在等待 uiautomator 截图帧..."
								: "点击侧边栏顶部启动按钮后，这里会自动显示 uiautomator 实时截图。"}
						</div>
					)}
				</div>

				<div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
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

			<section className="rounded-xl bg-white/82 p-5 shadow-sm ring-1 ring-slate-200">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="space-y-2">
						<span className="inline-flex rounded-md border border-violet-200 bg-violet-50 px-3 py-1 text-sm text-violet-700">
							scrcpy
						</span>
						<h2 className="font-semibold text-lg text-slate-950">
							手动视频预览
						</h2>
						<p className="text-slate-600 text-sm">
							scrcpy 用于低延迟人工调试预览，不会随脚本启动自动开启。
						</p>
					</div>

					<div className="flex flex-wrap gap-2">
						<div className="flex items-center gap-2 text-sm">
							<span className="text-slate-500">FPS</span>
							<Select
								disabled={scrcpy.scrcpyStatus?.running || scrcpy.isScrcpyBusy}
								value={String(scrcpy.scrcpyMaxFps)}
								onValueChange={(value) => scrcpy.setScrcpyMaxFps(Number(value))}
							>
								<SelectTrigger size="sm" className="w-22 bg-white">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{SCRCPY_FPS_OPTIONS.map((value) => (
										<SelectItem key={value} value={String(value)}>
											{value}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex items-center gap-2 text-sm">
							<span className="text-slate-500">分辨率</span>
							<Select
								disabled={scrcpy.scrcpyStatus?.running || scrcpy.isScrcpyBusy}
								value={String(scrcpy.scrcpyMaxSize)}
								onValueChange={(value) =>
									scrcpy.setScrcpyMaxSize(Number(value))
								}
							>
								<SelectTrigger size="sm" className="w-28 bg-white">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{SCRCPY_RESOLUTION_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={String(option.value)}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<Button
							type="button"
							className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400"
							disabled={status?.phase !== "ready" || scrcpy.isScrcpyBusy}
							onClick={scrcpy.toggleScrcpyPreview}
						>
							{scrcpy.scrcpyStatus?.running ? "停止 scrcpy" : "启动 scrcpy"}
						</Button>
					</div>
				</div>

				<div className="mt-5 aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
					<div className="relative h-full p-4">
						<div
							ref={scrcpy.scrcpyCanvasHostRef}
							className="flex h-full items-center justify-center"
						/>
						{scrcpy.isScrcpyCanvasReady ? null : (
							<div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8 text-center text-slate-500">
								{scrcpy.scrcpyStatus?.running
									? "正在等待 scrcpy 视频帧..."
									: "点击“启动 scrcpy”后，画面会通过 @yume-chan/scrcpy + WebCodecs 内嵌到此区域。"}
							</div>
						)}
					</div>
				</div>

				<div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
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
					<div className="mt-4 border-violet-500 border-l-2 bg-violet-50 p-4 text-sm text-violet-800">
						{scrcpy.scrcpyStatus.message}
					</div>
				) : null}
			</section>

			{streamError ? (
				<div className="border-rose-500 border-l-2 bg-rose-50 p-4 text-rose-800 text-sm">
					{streamError}
				</div>
			) : null}
		</div>
	);
}
