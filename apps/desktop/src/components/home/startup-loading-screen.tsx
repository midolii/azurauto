import { motion } from "motion/react";
import type { StartupResourceStatus } from "../../../electron/ipc/contract/index.ts";

export function StartupLoadingScreen({
	status,
}: {
	status: StartupResourceStatus | null;
}) {
	return (
		<motion.div
			className="flex min-h-screen items-center justify-center bg-[radial-gradient(720px_420px_at_18%_12%,rgba(147,216,255,0.38),transparent_62%),radial-gradient(680px_420px_at_84%_8%,rgba(255,226,236,0.48),transparent_64%),linear-gradient(180deg,#fbfdff_0%,#f2f8ff_52%,#edf7f3_100%)] px-6 text-slate-950"
			role="status"
			aria-busy="true"
			aria-live="polite"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.22 }}
		>
			<div className="flex max-w-md flex-col items-center px-10 py-9 text-center">
				<div
					className="mb-6 h-3 w-3 animate-pulse rounded-full bg-cyan-500 shadow-cyan-400/40 shadow-lg"
					aria-hidden="true"
				/>
				<p className="font-semibold text-cyan-700 text-sm uppercase tracking-[0.28em]">
					AzurAuto
				</p>
				<h1 className="mt-4 font-semibold text-2xl text-slate-950">
					正在准备本地资源
				</h1>
				<p className="mt-3 text-nowrap text-slate-600 leading-7">
					正在检查脚本运行需要的本地资源，不会自动连接 ADB 设备。
				</p>
				<p className="mt-6 min-h-5 text-slate-500 text-sm">
					{status?.message ?? "马上就好..."}
				</p>
			</div>
		</motion.div>
	);
}
