import type { BootstrapStatus, ScreenshotFrame } from "@azurauto/automation";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { ScrcpyPreviewStatus } from "../../electron/ipc/contract.ts";

type PreviewSource = "scrcpy" | "uiautomator2";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const [status, setStatus] = useState<BootstrapStatus | null>(null);
	const [isRetrying, setIsRetrying] = useState(false);
	const [isStreaming, setIsStreaming] = useState(false);
	const [previewSource, setPreviewSource] =
		useState<PreviewSource>("uiautomator2");
	const [frame, setFrame] = useState<ScreenshotFrame | null>(null);
	const [frameUrl, setFrameUrl] = useState<string | null>(null);
	const frameUrlRef = useRef<string | null>(null);
	const [fps, setFps] = useState(0);
	const [streamError, setStreamError] = useState<string | null>(null);
	const [scrcpyStatus, setScrcpyStatus] = useState<ScrcpyPreviewStatus | null>(
		null,
	);
	const [isScrcpyBusy, setIsScrcpyBusy] = useState(false);

	useEffect(() => {
		let cancelled = false;

		async function loadStatus() {
			const nextStatus = await window.environment.getBootstrapStatus();
			if (!cancelled) {
				setStatus(nextStatus);
			}
		}

		void loadStatus();
		const timer = window.setInterval(loadStatus, 1500);

		return () => {
			cancelled = true;
			window.clearInterval(timer);
		};
	}, []);

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
							setFps(Math.round((frames * 1000) / (now - fpsStartedAt)));
							frames = 0;
							fpsStartedAt = now;
						}

						setStreamError(null);
					}
				} catch (error) {
					if (!cancelled) {
						setStreamError(
							error instanceof Error ? error.message : "获取截图失败，请重试。",
						);
						setIsStreaming(false);
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
	}, [isStreaming, previewSource, status?.phase]);

	useEffect(() => {
		let cancelled = false;

		async function loadScrcpyStatus() {
			const nextStatus = await window.environment.getScrcpyPreviewStatus();
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
		return () => {
			if (frameUrlRef.current) {
				URL.revokeObjectURL(frameUrlRef.current);
			}
		};
	}, []);

	async function retryBootstrap() {
		setIsRetrying(true);
		try {
			setStatus(await window.environment.runBootstrap());
		} finally {
			setIsRetrying(false);
		}
	}

	const phaseCopy = getPhaseCopy(status);
	const canStream = status?.phase === "ready";
	const isUiautomator2Source = previewSource === "uiautomator2";

	function selectPreviewSource(source: PreviewSource) {
		setPreviewSource(source);
		setIsStreaming(false);
		setStreamError(null);
	}

	async function toggleScrcpyPreview() {
		setIsScrcpyBusy(true);
		try {
			setScrcpyStatus(
				scrcpyStatus?.running
					? await window.environment.stopScrcpyPreview()
					: await window.environment.startScrcpyPreview(),
			);
		} catch (error) {
			setStreamError(
				error instanceof Error ? error.message : "scrcpy 预览启动失败。",
			);
		} finally {
			setIsScrcpyBusy(false);
		}
	}

	return (
		<div className="min-h-screen bg-slate-950 p-6 text-slate-100">
			<main className="mx-auto max-w-6xl space-y-6">
				<header className="space-y-2">
					<p className="text-sm text-cyan-300">AzurAuto Desktop</p>
					<h1 className="text-2xl font-bold">自动化环境检查</h1>
					<p className="text-slate-400">
						打开应用后会自动检查模拟器 ADB 和
						ATX（小黄车自动化）组件，环境就绪后才能运行后续游戏自动化能力。
					</p>
				</header>

				<section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
					<div className="flex items-start justify-between gap-4">
						<div className="space-y-2">
							<span
								className={`inline-flex rounded-full px-3 py-1 text-sm ${phaseCopy.badgeClass}`}
							>
								{phaseCopy.label}
							</span>
							<h2 className="text-lg font-semibold">
								{status?.message ?? "正在读取环境状态..."}
							</h2>
							<p className="text-sm text-slate-400">{phaseCopy.description}</p>
						</div>

						<button
							type="button"
							className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
							disabled={!status?.recoverable || isRetrying}
							onClick={retryBootstrap}
						>
							{isRetrying ? "重试中..." : "重新检查"}
						</button>
					</div>

					<dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
						<StatusItem label="当前阶段" value={status?.phase ?? "loading"} />
						<StatusItem
							label="设备 Serial"
							value={status?.serial ?? "未选择设备"}
						/>
						<StatusItem label="错误码" value={status?.errorCode ?? "无"} />
						<StatusItem
							label="更新时间"
							value={status ? new Date(status.updatedAt).toLocaleString() : "-"}
						/>
					</dl>

					{status?.nextAction ? (
						<div className="mt-5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-cyan-100">
							下一步：{status.nextAction}
						</div>
					) : null}
				</section>

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
								disabled={!canStream || isScrcpyBusy}
								onClick={
									isUiautomator2Source
										? () => setIsStreaming((current) => !current)
										: toggleScrcpyPreview
								}
							>
								{isUiautomator2Source
									? isStreaming
										? "停止截图流"
										: "开始截图流"
									: scrcpyStatus?.running
										? "停止 scrcpy"
										: "启动 scrcpy"}
							</button>
						</div>
					</div>

					<div className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
						{isUiautomator2Source && frameUrl ? (
							<img
								alt="Android device live screenshot"
								className="mx-auto max-h-[620px] w-full object-contain"
								src={frameUrl}
							/>
						) : previewSource === "scrcpy" ? (
							<div className="flex min-h-80 items-center justify-center p-8 text-center text-slate-400">
								<div className="max-w-lg space-y-3">
									<p>
										scrcpy 会打开独立低延迟预览窗口；当前 Electron
										面板负责启动、停止和查看状态。
									</p>
									<p className="text-xs text-slate-500">
										后续如需嵌入到此区域，可接入 @yume-chan/scrcpy + WebCodecs
										canvas 解码。
									</p>
								</div>
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
									? scrcpyStatus?.running
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
						<StatusItem
							label="FPS"
							value={isUiautomator2Source ? String(fps) : "scrcpy 原生"}
						/>
						<StatusItem
							label="最新帧时间"
							value={frame ? new Date(frame.capturedAt).toLocaleString() : "-"}
						/>
					</div>

					{previewSource === "scrcpy" && scrcpyStatus ? (
						<div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-violet-100">
							{scrcpyStatus.message}
						</div>
					) : null}

					{streamError ? (
						<div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
							{streamError}
						</div>
					) : null}
				</section>
			</main>
		</div>
	);
}

function StatusItem({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl bg-slate-950/70 p-3">
			<dt className="text-slate-500">{label}</dt>
			<dd className="mt-1 break-all text-slate-200">{value}</dd>
		</div>
	);
}

function getPhaseCopy(status: BootstrapStatus | null) {
	switch (status?.phase) {
		case "ready":
			return {
				label: "已就绪",
				description: "模拟器和 ATX 已可用，可以继续接入后续截图自动化能力。",
				badgeClass: "bg-emerald-500/15 text-emerald-300",
			};
		case "no-adb":
			return {
				label: "ADB 缺失",
				description: "请安装 Android platform-tools，或确认 adb 已加入 PATH。",
				badgeClass: "bg-amber-500/15 text-amber-300",
			};
		case "no-device":
			return {
				label: "未发现模拟器",
				description:
					"请打开模拟器；如果设备未授权或 offline，请确认授权并重启连接。",
				badgeClass: "bg-amber-500/15 text-amber-300",
			};
		case "installing-atx":
			return {
				label: "正在安装 ATX",
				description: "正在向设备安装小黄车自动化组件，请不要关闭模拟器。",
				badgeClass: "bg-cyan-500/15 text-cyan-300",
			};
		case "failed":
			return {
				label: "检查失败",
				description: "自动修复失败，请根据提示处理安装包、权限或设备连接问题。",
				badgeClass: "bg-rose-500/15 text-rose-300",
			};
		case "checking-adb":
		case "checking-atx":
			return {
				label: "检查中",
				description: "正在检查 ADB 设备与 ATX 安装状态。",
				badgeClass: "bg-cyan-500/15 text-cyan-300",
			};
		default:
			return {
				label: "加载中",
				description: "正在从 native 环境读取当前状态。",
				badgeClass: "bg-slate-700 text-slate-300",
			};
	}
}
