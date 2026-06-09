import type { BootstrapStatus } from "@azurauto/automation";
import { motion } from "motion/react";

export function StartupLoadingScreen({
	status,
}: {
	status: BootstrapStatus | null;
}) {
	return (
		<motion.div
			className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100"
			role="status"
			aria-busy="true"
			aria-live="polite"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.22 }}
		>
			<div className="flex max-w-md flex-col items-center text-center">
				<div
					className="mb-6 h-3 w-3 animate-pulse rounded-full bg-cyan-200 shadow-cyan-200/50 shadow-lg"
					aria-hidden="true"
				/>
				<p className="font-semibold text-cyan-200 text-sm uppercase tracking-[0.28em]">
					AzurAuto
				</p>
				<h1 className="mt-4 font-semibold text-2xl text-white">
					正在准备使用环境
				</h1>
				<p className="mt-3 text-nowrap text-slate-400 leading-7">
					正在连接设备，并准备运行所需内容。请保持模拟器或安卓设备开启。
				</p>
				<p className="mt-6 min-h-5 text-slate-500 text-sm">
					{status?.message ?? "马上就好..."}
				</p>
			</div>
		</motion.div>
	);
}
