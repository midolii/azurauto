import {
	Bug,
	Clock3,
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
import {
	type DesktopPage,
	desktopStore,
	useDesktopStore,
} from "#/stores/desktop-store.ts";

const navItems: Array<{
	page: DesktopPage;
	label: string;
	description: string;
	icon: typeof Home;
}> = [
	{
		page: "home",
		label: "首页",
		description: "欢迎入口",
		icon: Home,
	},
	{
		page: "debug",
		label: "Debug",
		description: "环境与预览",
		icon: Bug,
	},
	{
		page: "tasks",
		label: "日志记录",
		description: "运行与耗时",
		icon: PlaySquare,
	},
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
	const canStart = resourceStatus?.ready && !isRuntimeBusy;
	const canToggleRuntime = isRuntimeActive || canStart;
	const RuntimeControlIcon = isRuntimeBusy
		? LoaderCircle
		: isRuntimeRunning
			? Pause
			: Play;

	async function toggleRuntime() {
		if (!isRuntimeActive) {
			desktopStore.setRuntime({
				phase: "starting",
				message: "脚本正在启动，请耐心等待。",
				screenshotCaptureRunning: false,
				updatedAt: new Date().toISOString(),
			});
			const startPromise = window.runtime.start().then((nextRuntime) => {
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

		desktopStore.setRuntime(await window.runtime.pause());
	}

	return (
		<Sidebar className="border-white/60 bg-white/74 shadow-[0_24px_60px_rgba(15,55,66,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/82">
			<SidebarHeader>
				<div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
					<img
						src="/icon.png"
						srcSet="/icon.png 1x, /icon-source.png 2x"
						alt="AzurAuto"
						aria-hidden="true"
						className="size-11 shrink-0 rounded-2xl object-cover shadow-sm ring-1 ring-cyan-600/10"
					/>
					<div className="min-w-0">
						<p className="truncate font-bold text-slate-950 text-sm dark:text-slate-50">
							AzurAuto
						</p>
						<p className="text-muted-foreground text-xs">Desktop Console</p>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						className="ml-auto rounded-full hover:bg-transparent"
						aria-label={
							isRuntimeActive ? "Pause script runtime" : "Start script runtime"
						}
						disabled={!canToggleRuntime}
						onClick={toggleRuntime}
					>
						<RuntimeControlIcon
							className={`size-5 ${isRuntimeBusy ? "animate-spin text-slate-400" : isRuntimeRunning ? "text-red-500" : "text-emerald-500"}`}
							aria-hidden="true"
						/>
					</Button>
				</div>

				<div className="rounded-2xl border border-cyan-700/10 bg-cyan-50/80 p-3 dark:border-cyan-300/10 dark:bg-cyan-300/5">
					<div className="flex items-center justify-between gap-2">
						<p className="font-semibold text-cyan-950 text-sm dark:text-cyan-100">
							{taskExecution.name}
						</p>
						<span className="rounded-full bg-white/80 px-2 py-0.5 font-medium text-[0.68rem] text-cyan-800 capitalize ring-1 ring-cyan-700/10 dark:bg-white/10 dark:text-cyan-100">
							{taskExecution.status}
						</span>
					</div>
					<div className="mt-3 flex items-center gap-2 text-cyan-900/70 text-xs dark:text-cyan-100/70">
						<Clock3 className="size-3.5" aria-hidden="true" />
						<span>执行时间 {taskExecution.elapsedLabel}</span>
					</div>
					<div className="mt-3 flex items-center gap-2">
						<span className="min-w-0 truncate text-cyan-900/70 text-xs dark:text-cyan-100/70">
							{runtime.message}
						</span>
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
					className="w-full justify-start rounded-xl transition-all duration-150 ease-out active:scale-[0.98]"
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
