import {
	CircleAlert,
	CircleCheck,
	Info,
	TerminalSquare,
	TriangleAlert,
} from "lucide-react";

import { PageFrame } from "#/components/app-shell/page-frame.tsx";
import { Button } from "#/components/ui/button.tsx";
import { desktopStore, useDesktopStore } from "#/stores/desktop-store.ts";

export function TaskExecutionPage() {
	const logs = useDesktopStore((state) => state.logs);

	async function clearLogs() {
		desktopStore.setLogs(await window.logger.clearEntries());
	}

	return (
		<PageFrame
			kicker="Logs"
			title="日志记录"
			description="记录运行时、环境检查和性能耗时日志，便于定位启动与截图链路耗时。"
			className="h-full min-h-0"
		>
			<div className="flex h-full min-h-0 flex-col">
				<section className="flex min-h-0 flex-1 flex-col text-slate-950">
					<div className="flex items-center justify-between gap-3 border-slate-200 border-b pb-3">
						<div className="flex items-center gap-2">
							<TerminalSquare
								className="size-4 text-sky-600"
								aria-hidden="true"
							/>
							<h2 className="font-semibold text-sm">运行日志</h2>
							<span className="border-slate-400 border-l-2 bg-slate-50 px-2 py-0.5 font-mono text-[0.68rem] text-slate-500">
								{logs.length} 条
							</span>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-8 rounded-lg border border-slate-200 px-3 text-slate-600 text-xs hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 disabled:opacity-40"
							disabled={logs.length === 0}
							onClick={clearLogs}
						>
							Clear
						</Button>
					</div>
					<div className="min-h-0 flex-1 overflow-hidden">
						<div className="h-full space-y-2 overflow-auto py-4 font-mono text-xs">
							{logs.length === 0 ? (
								<div className="flex min-h-full items-center justify-center rounded-xl border border-slate-300 border-dashed bg-white p-6 text-center text-slate-500">
									暂无日志。点击 Start
									后，这里会显示运行链路、环境检查和截图耗时。
								</div>
							) : null}
							{logs.map((log) => {
								const LevelIcon = getLevelIcon(log.level);

								return (
									<div
										key={log.id}
										className="rounded-lg border border-slate-200 bg-white p-3 ring-1 ring-transparent transition-colors hover:border-slate-300 hover:bg-slate-50"
									>
										<div className="flex flex-wrap items-center gap-2 text-[0.7rem]">
											<span className="text-sky-700">
												{new Date(log.timestamp).toLocaleTimeString()}
											</span>
											<span className={getLevelClassName(log.level)}>
												<LevelIcon className="size-3" aria-hidden="true" />
												{log.level}
											</span>
											<span className="border-sky-500 border-l-2 bg-sky-50 px-2 py-0.5 text-sky-700">
												{log.scope}
											</span>
											{log.durationMs === undefined ? null : (
												<span className="border-amber-500 border-l-2 bg-amber-50 px-2 py-0.5 text-amber-700">
													{log.durationMs}ms
												</span>
											)}
										</div>
										{log.message === "completed" ? null : (
											<p className="mt-2 text-slate-700 leading-5">
												{log.message}
											</p>
										)}
									</div>
								);
							})}
						</div>
					</div>
				</section>
			</div>
		</PageFrame>
	);
}

function getLevelIcon(level: string) {
	if (level === "error") return CircleAlert;
	if (level === "warn") return TriangleAlert;
	if (level === "debug") return Info;
	return CircleCheck;
}

function getLevelClassName(level: string) {
	if (level === "error") {
		return "inline-flex items-center gap-1 border-rose-500 border-l-2 bg-rose-50 px-2 py-0.5 text-rose-700";
	}

	if (level === "warn") {
		return "inline-flex items-center gap-1 border-amber-500 border-l-2 bg-amber-50 px-2 py-0.5 text-amber-700";
	}

	if (level === "debug") {
		return "inline-flex items-center gap-1 border-violet-500 border-l-2 bg-violet-50 px-2 py-0.5 text-violet-700";
	}

	return "inline-flex items-center gap-1 border-emerald-500 border-l-2 bg-emerald-50 px-2 py-0.5 text-emerald-700";
}
