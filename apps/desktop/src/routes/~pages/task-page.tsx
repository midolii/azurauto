import type { LucideIcon } from "lucide-react";
import { Activity, PlaySquare } from "lucide-react";

import { PageFrame } from "#/components/app-shell/page-frame.tsx";
import { useDesktopStore } from "#/stores/desktop-store.ts";

export function TaskPage() {
	const runtime = useDesktopStore((state) => state.runtime);
	const taskExecution = useDesktopStore((state) => state.taskExecution);
	const logs = useDesktopStore((state) => state.logs);

	const executedTaskLogs = logs.filter((log) => log.durationMs !== undefined);
	const taskRows = [...executedTaskLogs].reverse();
	const executedTaskCount = executedTaskLogs.length;

	return (
		<PageFrame
			kicker="Tasks"
			title="任务"
			description="承载脚本运行中的任务列表与概要信息，展示已执行任务、累计耗时与当前运行时间。"
			className="h-full min-h-0"
		>
			<div className="flex h-full min-h-0 flex-col gap-5">
				<section className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
					<SummaryCard
						icon={PlaySquare}
						label="执行任务数量"
						value={`${executedTaskCount}`}
						description="已完成耗时记录数"
						tone="sky"
					/>
					<SummaryCard
						icon={Activity}
						label="当前运行时间"
						value={taskExecution.elapsedLabel}
						description={taskExecution.name}
						tone={runtime.phase === "running" ? "emerald" : "slate"}
					/>
				</section>

				<section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm">
					<div className="flex items-center justify-between gap-3 border-slate-200 border-b px-4 py-3 sm:px-5">
						<div className="min-w-0">
							<p className="command-kicker">Execution Queue</p>
							<h2 className="mt-1 font-semibold text-lg text-slate-950">
								任务列表
							</h2>
						</div>
						<div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 font-mono text-[0.7rem] text-sky-700">
							{executedTaskCount} 条
						</div>
					</div>

					<div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">
						{taskRows.length === 0 ? (
							<div className="flex min-h-70 flex-col items-center justify-center rounded-2xl border border-slate-300 border-dashed bg-slate-50/80 p-6 text-center text-slate-500">
								<p className="font-medium text-slate-700 text-sm">
									暂无已完成任务记录
								</p>
								<p className="mt-2 max-w-md text-sm leading-6">
									当前任务为「{taskExecution.name}」，运行时间{" "}
									{taskExecution.elapsedLabel}
									。脚本产生耗时日志后，这里会展示任务清单与耗时。
								</p>
								<div className="mt-5 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-sky-700 text-xs">
									<Activity className="size-3.5" aria-hidden="true" />
									{runtime.message}
								</div>
							</div>
						) : (
							<div className="space-y-3">
								{taskRows.map((log) => (
									<article
										key={log.id}
										className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-colors hover:border-sky-200 hover:bg-white"
									>
										<div className="flex flex-wrap items-start justify-between gap-3">
											<div className="min-w-0">
												<p className="truncate font-semibold text-slate-950 text-sm">
													{formatScopeLabel(log.scope)}
												</p>
												<div className="mt-1 flex flex-wrap items-center gap-2 text-[0.72rem]">
													<span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-sky-700">
														{log.scope}
													</span>
													<span className="text-slate-500">
														{formatTaskMessage(log.message)}
													</span>
													<span className="text-slate-500">
														{new Date(log.timestamp).toLocaleString()}
													</span>
												</div>
											</div>
											<div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-mono text-amber-700 text-xs">
												{formatDurationMs(log.durationMs ?? 0)}
											</div>
										</div>
									</article>
								))}
							</div>
						)}
					</div>
				</section>
			</div>
		</PageFrame>
	);
}

function SummaryCard({
	icon: Icon,
	label,
	value,
	description,
	tone,
}: {
	icon: LucideIcon;
	label: string;
	value: string;
	description: string;
	tone: "sky" | "amber" | "emerald" | "slate";
}) {
	const toneClass = {
		sky: "border-sky-200 bg-sky-50 text-sky-800",
		amber: "border-amber-200 bg-amber-50 text-amber-800",
		emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
		slate: "border-slate-200 bg-slate-50 text-slate-700",
	}[tone];

	return (
		<div className={`rounded-xl border p-4 ${toneClass}`}>
			<div className="flex items-start gap-3">
				<Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
				<div className="min-w-0">
					<p className="font-mono text-[0.64rem] uppercase tracking-[0.14em] opacity-70">
						{label}
					</p>
					<p className="mt-1 truncate font-semibold text-base">{value}</p>
					<p className="mt-1 line-clamp-1 text-xs opacity-75">{description}</p>
				</div>
			</div>
		</div>
	);
}

function formatDurationMs(durationMs: number) {
	if (durationMs <= 0) {
		return "0ms";
	}

	if (durationMs < 1000) {
		return `${durationMs}ms`;
	}

	const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
	}

	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatScopeLabel(scope: string) {
	const segments = scope.split(".").filter(Boolean);
	const label = segments.at(-1) ?? scope;

	return label
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/[-_]/g, " ")
		.trim();
}

function formatTaskMessage(message: string) {
	return message === "completed" ? "耗时采样完成" : message;
}
