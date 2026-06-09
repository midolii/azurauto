import type { BootstrapStatus, ScreenshotFrame } from "@azurauto/automation";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const [status, setStatus] = useState<BootstrapStatus | null>(null);
	const [isRetrying, setIsRetrying] = useState(false);
	const [isStreaming, setIsStreaming] = useState(false);
	const [frame, setFrame] = useState<ScreenshotFrame | null>(null);
	const [streamError, setStreamError] = useState<string | null>(null);

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
		if (!isStreaming || status?.phase !== "ready") {
			return;
		}

		let cancelled = false;
		let inFlight = false;

		async function captureFrame() {
			if (inFlight) {
				return;
			}

			inFlight = true;
			try {
				const nextFrame = await window.environment.captureScreenshot();
				if (!cancelled) {
					setFrame(nextFrame);
					setStreamError(null);
				}
			} catch (error) {
				if (!cancelled) {
					setStreamError(
						error instanceof Error ? error.message : "获取截图失败，请重试。",
					);
					setIsStreaming(false);
				}
			} finally {
				inFlight = false;
			}
		}

		void captureFrame();
		const timer = window.setInterval(captureFrame, 10);

		return () => {
			cancelled = true;
			window.clearInterval(timer);
		};
	}, [isStreaming, status?.phase]);

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
	const frameSrc = frame
		? `data:${frame.mimeType};base64,${frame.base64}`
		: undefined;

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
								实时截图流
							</span>
							<h2 className="text-lg font-semibold">模拟器实时画面</h2>
							<p className="text-sm text-slate-400">
								环境 ready 后，每 10ms 从 native 层抓取一帧 PNG 截图并显示。
							</p>
						</div>

						<button
							type="button"
							className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
							disabled={!canStream}
							onClick={() => setIsStreaming((current) => !current)}
						>
							{isStreaming ? "停止截图流" : "开始截图流"}
						</button>
					</div>

					<div className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
						{frameSrc ? (
							<img
								alt="Android device live screenshot"
								className="mx-auto max-h-[620px] w-full object-contain"
								src={frameSrc}
							/>
						) : (
							<div className="flex min-h-80 items-center justify-center p-8 text-center text-slate-500">
								{canStream
									? "点击“开始截图流”查看模拟器实时画面。"
									: "等待 ADB/ATX 环境 ready 后可开启截图流。"}
							</div>
						)}
					</div>

					<div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
						<StatusItem
							label="截图状态"
							value={isStreaming ? "运行中" : "已停止"}
						/>
						<StatusItem
							label="截图设备"
							value={frame?.serial ?? status?.serial ?? "-"}
						/>
						<StatusItem
							label="最新帧时间"
							value={frame ? new Date(frame.capturedAt).toLocaleString() : "-"}
						/>
					</div>

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
