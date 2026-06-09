import { FolderCog, Settings2 } from "lucide-react";

import { PageFrame } from "#/components/app-shell/page-frame.tsx";
import { Button } from "#/components/ui/button.tsx";
import { desktopStore, useDesktopStore } from "#/stores/desktop-store.ts";

export function SettingsPage() {
	const settings = useDesktopStore((state) => state.settings);

	return (
		<PageFrame
			kicker="Settings"
			title="设置"
			description="后续会从本地读取配置并写入全局状态。当前先预留设置页面和配置状态展示。"
		>
			<div className="grid gap-4 lg:grid-cols-2">
				<section className="command-panel-soft rounded-xl p-5">
					<div className="mb-4 flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
							<FolderCog className="size-5" aria-hidden="true" />
						</div>
						<div>
							<h2 className="font-semibold text-slate-950">本地配置</h2>
							<p className="text-slate-500 text-sm">
								Local settings placeholder
							</p>
						</div>
					</div>
					<dl className="space-y-3 text-sm">
						<div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white/80 px-4 py-3">
							<dt className="text-slate-500">Config path</dt>
							<dd className="truncate font-medium text-slate-900">
								{settings.configPath ?? "Not loaded"}
							</dd>
						</div>
						<div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white/80 px-4 py-3">
							<dt className="text-slate-500">Loaded at</dt>
							<dd className="font-medium text-slate-900">
								{settings.loadedAt ?? "Pending"}
							</dd>
						</div>
					</dl>
					<Button
						type="button"
						className="mt-5"
						onClick={() =>
							desktopStore.setSettings({
								configPath: "~/AzurAuto/settings.json",
								loadedAt: new Date().toLocaleTimeString(),
							})
						}
					>
						模拟读取配置
					</Button>
				</section>

				<section className="command-panel-soft rounded-xl p-5">
					<div className="mb-4 flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700 ring-1 ring-sky-200">
							<Settings2 className="size-5" aria-hidden="true" />
						</div>
						<div>
							<h2 className="font-semibold text-slate-950">预留设置项</h2>
							<p className="text-slate-500 text-sm">待接入真实配置表单</p>
						</div>
					</div>
					<p className="text-slate-600 text-sm leading-6">
						后续可以在这里添加脚本路径、设备偏好、运行参数等设置。配置读取后应写入全局
						store，供任务执行页和 sidebar 共享。
					</p>
				</section>
			</div>
		</PageFrame>
	);
}
