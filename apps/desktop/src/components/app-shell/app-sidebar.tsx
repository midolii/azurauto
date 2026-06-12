import type { LucideIcon } from "lucide-react";
import {
	Activity,
	Bug,
	Clock3,
	CpuIcon,
	Home,
	LoaderCircle,
	Pause,
	Play,
	PlaySquare,
	Settings,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "#/components/ui/button.tsx";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
} from "#/components/ui/sidebar.tsx";
import { desktopPlatform } from "#/platform/index.ts";
import {
	type DesktopPage,
	desktopStore,
	useDesktopStore,
} from "#/stores/desktop-store.ts";

const navItems: Array<{
	page: DesktopPage;
	label: string;
	description: string;
	icon: LucideIcon;
}> = [
	{ page: "home", label: "控制台", description: "运行入口", icon: Home },
	{
		page: "tasks",
		label: "任务",
		description: "执行列表 / 运行任务",
		icon: PlaySquare,
	},
	{
		page: "logs",
		label: "日志记录",
		description: "运行与耗时",
		icon: Clock3,
	},
	{ page: "debug", label: "Debug", description: "环境与预览", icon: Bug },
];

export function AppSidebar() {
	const activePage = useDesktopStore((state) => state.activePage);
	const resourceStatus = useDesktopStore((state) => state.resourceStatus);
	const runtime = useDesktopStore((state) => state.runtime);
	const taskExecution = useDesktopStore((state) => state.taskExecution);
	const isRuntimeBusy =
		runtime.phase === "starting" || runtime.phase === "pausing";
	const isRuntimeRunning = runtime.phase === "running";
	const isRuntimeActive = isRuntimeRunning || runtime.phase === "starting";
	const runtimeCapability = desktopPlatform.getCapabilities().runtimeControl;
	const canStart =
		runtimeCapability.status === "available" &&
		resourceStatus?.ready &&
		!isRuntimeBusy;
	const canToggleRuntime = isRuntimeActive || canStart;
	const RuntimeControlIcon = isRuntimeBusy
		? LoaderCircle
		: isRuntimeRunning
			? Pause
			: Play;
	const runtimeTone = getRuntimeTone(runtime.phase);
	const resourceTone = resourceStatus?.ready
		? "text-emerald-700"
		: resourceStatus?.phase === "failed" || resourceStatus?.warnings.length
			? "text-amber-700"
			: "text-slate-500";

	async function toggleRuntime() {
		if (runtimeCapability.status !== "available") {
			toast.error(runtimeCapability.message);
			return;
		}

		if (!isRuntimeActive) {
			desktopStore.setRuntime({
				phase: "starting",
				message: "脚本正在启动，请耐心等待。",
				screenshotCaptureRunning: false,
				updatedAt: new Date().toISOString(),
			});
			const startPromise = desktopPlatform.runtime
				.start()
				.then((nextRuntime) => {
					desktopStore.setRuntime(nextRuntime);
					if (nextRuntime.phase === "error") {
						throw new Error(nextRuntime.message);
					}

					return nextRuntime;
				});

			toast.promise(startPromise, {
				loading: "脚本正在启动，请耐心等待",
				success: "脚本已启动",
				error: (error) =>
					error instanceof Error ? error.message : "脚本启动失败",
			});

			await startPromise.catch(() => undefined);
			return;
		}

		desktopStore.setRuntime(await desktopPlatform.runtime.pause());
	}

	return (
		<Sidebar className="border-slate-200/90 bg-white/86 shadow-[18px_0_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
			<SidebarHeader className="gap-4 p-4">
				<div className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm ring-1 ring-sky-500/10">
					<div className="flex items-center gap-3">
						<img
							src="/icon.png"
							srcSet="/icon.png 1x, /icon-source.png 2x"
							alt="AzurAuto"
							className="size-11 shrink-0 rounded-lg object-cover shadow-sm ring-1 ring-sky-200"
						/>
						<div className="min-w-0">
							<p className="truncate font-bold text-slate-950 text-sm">
								AzurAuto
							</p>
							<p className="font-mono text-[0.68rem] text-sky-700 uppercase tracking-[0.14em]">
								Desktop Console
							</p>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className="ml-auto rounded-md text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 disabled:opacity-45"
							aria-label={
								isRuntimeActive
									? "Pause script runtime"
									: "Start script runtime"
							}
							disabled={!canToggleRuntime}
							onClick={toggleRuntime}
						>
							<RuntimeControlIcon
								className={`size-5 ${isRuntimeBusy ? "animate-spin text-sky-600" : isRuntimeRunning ? "text-amber-600" : "text-emerald-600"}`}
								aria-hidden="true"
							/>
						</Button>
					</div>
				</div>

				<div className="rounded-xl border border-slate-200 bg-white/76 p-4 shadow-sm">
					<div className="mb-3 flex items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<Activity
								className={`size-4 ${runtimeTone.icon}`}
								aria-hidden="true"
							/>
							<p className="font-semibold text-slate-900 text-sm">运行状态</p>
						</div>
					</div>

					<p className="line-clamp-2 text-slate-600 text-xs leading-4">
						{runtime.message}
					</p>
					<div className="mt-4 grid grid-cols-2 gap-2 text-xs">
						<div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
							<div className="flex items-center gap-1.5 text-slate-500">
								<Clock3 className="size-3.5" aria-hidden="true" />
								<span>运行时间</span>
							</div>
							<p className="mt-1 font-mono text-slate-950">
								{taskExecution.elapsedLabel}
							</p>
						</div>
						<div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
							<div className="flex items-center gap-1.5 text-slate-500">
								<CpuIcon className="size-3.5" aria-hidden="true" />
								<span>Core</span>
							</div>
							<p className={`mt-1 font-mono ${resourceTone}`}>
								{resourceStatus?.ready
									? "ready"
									: (resourceStatus?.phase ?? "pending")}
							</p>
						</div>
					</div>
				</div>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Navigation</SidebarGroupLabel>
					<SidebarMenu aria-label="Desktop sections">
						{navItems.map((item) => {
							const Icon = item.icon;
							const isActive = activePage === item.page;

							return (
								<SidebarMenuButton
									key={item.page}
									type="button"
									isActive={isActive}
									aria-current={isActive ? "page" : undefined}
									onClick={() => desktopStore.setActivePage(item.page)}
								>
									<Icon className="size-4" aria-hidden="true" />
									<span className="min-w-0">
										<span className="block truncate">{item.label}</span>
										<span className="block truncate font-normal text-[0.7rem] opacity-70">
											{item.description}
										</span>
									</span>
								</SidebarMenuButton>
							);
						})}
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter>
				<Button
					type="button"
					variant={activePage === "settings" ? "secondary" : "ghost"}
					className="w-full justify-start rounded-lg border border-slate-200 bg-white/62 text-slate-700 transition-all duration-150 ease-out hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 active:scale-[0.98] active:border-sky-300 active:bg-sky-100"
					onClick={() => desktopStore.setActivePage("settings")}
					aria-current={activePage === "settings" ? "page" : undefined}
				>
					<Settings className="size-4" aria-hidden="true" />
					Settings
				</Button>
			</SidebarFooter>
		</Sidebar>
	);
}

function getRuntimeTone(phase: string) {
	if (phase === "running" || phase === "starting") {
		return {
			icon: "text-emerald-600",
			badge: "border-emerald-500 bg-emerald-50 text-emerald-700",
		};
	}

	if (phase === "paused" || phase === "pausing") {
		return {
			icon: "text-amber-600",
			badge: "border-amber-500 bg-amber-50 text-amber-700",
		};
	}

	if (phase === "error") {
		return {
			icon: "text-rose-600",
			badge: "border-rose-500 bg-rose-50 text-rose-700",
		};
	}

	return {
		icon: "text-slate-500",
		badge: "border-slate-400 bg-slate-100 text-slate-600",
	};
}
