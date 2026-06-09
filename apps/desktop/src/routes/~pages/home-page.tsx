import { Sparkles } from "lucide-react";

import { PageFrame } from "#/components/app-shell/page-frame.tsx";

export function HomePage() {
	return (
		<PageFrame title="首页" showHeader={false}>
			<div className="flex min-h-130 items-center justify-center">
				<div className="max-w-2xl text-center">
					<div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-3xl bg-cyan-100 text-cyan-700 shadow-sm ring-1 ring-cyan-700/10 dark:bg-cyan-400/10 dark:text-cyan-200">
						<Sparkles className="size-8" aria-hidden="true" />
					</div>
					<p className="font-semibold text-cyan-700 text-sm uppercase tracking-[0.2em] dark:text-cyan-300">
						AzurAuto
					</p>
					<h1 className="mt-4 font-bold text-4xl text-slate-950 tracking-tight dark:text-slate-50">
						欢迎使用自动化脚本控制台
					</h1>
					<p className="mt-4 text-slate-600 leading-7 dark:text-slate-300">
						打开应用后只会准备本地资源，不会自动连接
						ADB。点击侧边栏顶部开始按钮后，才会连接设备并启动脚本截图输入。
					</p>
				</div>
			</div>
		</PageFrame>
	);
}
