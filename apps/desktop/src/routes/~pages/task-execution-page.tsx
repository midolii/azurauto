import { FileClock, TerminalSquare } from "lucide-react";

import { PageFrame } from "#/components/app-shell/page-frame.tsx";
import { Button } from "#/components/ui/button.tsx";
import { desktopStore, useDesktopStore } from "#/stores/desktop-store.ts";

export function TaskExecutionPage() {
	const logs = useDesktopStore((state) => state.scriptLogs);

	return (
		<PageFrame
			kicker="Task Execution"
			title="任务执行"
			description="任务执行能力会在后续版本接入。当前页面先保留空状态和日志状态容器，用于验证页面切换时状态不会被清空。"
		>
			<div className="grid h-full min-h-115 gap-4 lg:grid-cols-[1fr_360px]">
				<div className="flex flex-col items-center justify-center rounded-3xl border border-cyan-700/20 border-dashed bg-cyan-50/50 p-8 text-center dark:border-cyan-300/15 dark:bg-cyan-300/5">
					<div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-white text-cyan-700 shadow-sm ring-1 ring-cyan-700/10 dark:bg-white/10 dark:text-cyan-100">
						<FileClock className="size-8" aria-hidden="true" />
					</div>
					<h2 className="font-semibold text-lg text-slate-950 dark:text-slate-50">
						暂无运行中的任务
					</h2>
					<p className="mt-2 max-w-md text-slate-600 text-sm leading-6 dark:text-slate-300">
						这里将展示任务执行进度、运行日志和控制入口。现在仅展示空状态，后续接入脚本执行能力。
					</p>
					<Button
						type="button"
						variant="outline"
						className="mt-5"
						onClick={() =>
							desktopStore.appendScriptLog("Page switch state check log")
						}
					>
						添加测试日志
					</Button>
				</div>

				<aside className="flex min-h-0 flex-col rounded-3xl border border-slate-200/70 bg-slate-950 p-4 text-slate-100 shadow-sm dark:border-white/10">
					<div className="mb-3 flex items-center gap-2 border-slate-800 border-b pb-3">
						<TerminalSquare
							className="size-4 text-cyan-300"
							aria-hidden="true"
						/>
						<h2 className="font-semibold text-sm">Script Logs</h2>
					</div>
					<div className="min-h-0 flex-1 space-y-2 overflow-auto font-mono text-xs">
						{logs.map((log) => (
							<div key={log.id} className="rounded-xl bg-white/5 p-3">
								<p className="text-cyan-200">[{log.timestamp}]</p>
								<p className="mt-1 text-slate-200">{log.message}</p>
							</div>
						))}
					</div>
				</aside>
			</div>
		</PageFrame>
	);
}
