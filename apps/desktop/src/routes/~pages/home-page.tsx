import type { LucideIcon } from "lucide-react";
import { CpuIcon, Play, TerminalSquare } from "lucide-react";

import { PageFrame } from "#/components/app-shell/page-frame.tsx";
import { useDesktopStore } from "#/stores/desktop-store.ts";

export function HomePage() {
	const runtime = useDesktopStore((state) => state.runtime);
	const resourceStatus = useDesktopStore((state) => state.resourceStatus);
	const logs = useDesktopStore((state) => state.logs);

	return (
		<PageFrame title="控制台" showHeader={false}>
			<div className="flex min-h-full flex-col gap-5">
				<section className="px-3 py-4 lg:px-5 lg:py-6">
					<p className="command-kicker">AzurAuto Runtime</p>
					<h1 className="mt-4 max-w-3xl font-bold text-4xl text-slate-950 tracking-tight lg:text-5xl">
						自动化脚本命令中心
					</h1>
					<p className="mt-4 max-w-2xl text-base text-slate-600 leading-7">
						应用启动后只准备本地资源，不会自动连接 ADB。确认资源 ready
						后，通过侧边栏 Start 控制脚本截图输入和后续自动化链路。
					</p>

					<div className="mt-6 flex flex-wrap gap-2.5">
						<OverviewCard
							icon={CpuIcon}
							label="Core"
							value={resourceStatus?.phase ?? "pending"}
							description={
								resourceStatus?.ready ? "本地资源已就绪" : "等待资源检查"
							}
							tone={resourceStatus?.ready ? "success" : "muted"}
						/>
						<OverviewCard
							icon={Play}
							label="运行状态"
							value={runtime.phase}
							description={runtime.message}
							tone={
								runtime.phase === "running"
									? "success"
									: runtime.phase === "error"
										? "danger"
										: "info"
							}
						/>
						<OverviewCard
							icon={TerminalSquare}
							label="日志记录"
							value={`${logs.length} 条`}
							description="运行时与耗时记录"
							tone="info"
						/>
					</div>
				</section>

				<section className="border-sky-200 border-t p-5 text-sky-950">
					<p className="font-semibold text-sm">启动路径</p>
					<ol className="mt-3 flex flex-col space-y-2 text-sky-900/74 text-sm leading-6">
						<li>1. 等待本地资源准备为 ready。</li>
						<li>2. 在侧边栏点击 Start，开始连接设备并启动截图输入。</li>
						<li>3. 打开 Debug 查看预览，打开任务查看执行列表。</li>
					</ol>
				</section>
			</div>
		</PageFrame>
	);
}

function OverviewCard({
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
	tone: "success" | "info" | "danger" | "muted";
}) {
	const toneClass = {
		success: "border-emerald-200 bg-emerald-50 text-emerald-800",
		info: "border-sky-200 bg-sky-50 text-sky-800",
		danger: "border-rose-200 bg-rose-50 text-rose-800",
		muted: "border-slate-200 bg-slate-50 text-slate-700",
	}[tone];

	return (
		<div
			className={`min-w-44 rounded-lg border border-l-4 px-3 py-2 ${toneClass}`}
		>
			<div className="flex items-start gap-3">
				<Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
				<div className="min-w-0">
					<p className="font-mono text-[0.64rem] uppercase tracking-[0.12em] opacity-70">
						{label}
					</p>
					<p className="mt-0.5 truncate font-semibold text-sm">{value}</p>
					<p className="mt-1 line-clamp-1 text-xs opacity-74">{description}</p>
				</div>
			</div>
		</div>
	);
}
