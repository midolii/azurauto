import { TerminalSquare } from "lucide-react";

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
		>
			<div className="h-full min-h-115">
				<section className="flex h-full min-h-0 flex-col rounded-3xl border border-slate-200/70 bg-slate-950 p-4 text-slate-100 shadow-sm dark:border-white/10">
					<div className="mb-3 flex items-center justify-between gap-3 border-slate-800 border-b pb-3">
						<div className="flex items-center gap-2">
							<TerminalSquare
								className="size-4 text-cyan-300"
								aria-hidden="true"
							/>
							<h2 className="font-semibold text-sm">运行日志</h2>
							<span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.68rem] text-slate-400">
								{logs.length} 条
							</span>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-7 rounded-lg px-2 text-slate-300 text-xs hover:bg-white/10 hover:text-white"
							disabled={logs.length === 0}
							onClick={clearLogs}
						>
							Clear
						</Button>
					</div>
					<div className="min-h-0 flex-1 space-y-2 overflow-auto font-mono text-xs">
						{logs.length === 0 ? (
							<div className="rounded-xl bg-white/5 p-3 text-slate-400">
								暂无日志，点击 Start 后会显示运行链路耗时。
							</div>
						) : null}
						{logs.map((log) => (
							<div
								key={log.id}
								className="rounded-xl border border-white/5 bg-white/5 p-3 ring-1 ring-transparent transition-colors hover:bg-white/[0.07]"
							>
								<div className="flex flex-wrap items-center gap-2 text-[0.7rem]">
									<span className="text-cyan-200">
										{new Date(log.timestamp).toLocaleTimeString()}
									</span>
									<span className={getLevelClassName(log.level)}>
										{log.level}
									</span>
									<span className="rounded-md bg-cyan-400/10 px-2 py-0.5 text-cyan-200">
										{log.scope}
									</span>
									{log.durationMs === undefined ? null : (
										<span className="rounded-md bg-amber-400/10 px-2 py-0.5 text-amber-200">
											{log.durationMs}ms
										</span>
									)}
								</div>
								{log.message === "completed" ? null : (
									<p className="mt-2 text-slate-300 leading-5">{log.message}</p>
								)}
							</div>
						))}
					</div>
				</section>
			</div>
		</PageFrame>
	);
}

function getLevelClassName(level: string) {
	if (level === "error") {
		return "rounded-md bg-rose-400/10 px-2 py-0.5 text-rose-200";
	}

	if (level === "warn") {
		return "rounded-md bg-amber-400/10 px-2 py-0.5 text-amber-200";
	}

	if (level === "debug") {
		return "rounded-md bg-violet-400/10 px-2 py-0.5 text-violet-200";
	}

	return "rounded-md bg-emerald-400/10 px-2 py-0.5 text-emerald-200";
}
