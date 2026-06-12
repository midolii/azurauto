import { motion } from "motion/react";
import type { StartupResourceStatus } from "../../../electron/ipc/contract/index.ts";

export function StartupLoadingScreen({
	status,
}: {
	status: StartupResourceStatus | null;
}) {
	return (
		<motion.div
			className="flex min-h-screen items-center justify-center bg-[radial-gradient(780px_460px_at_14%_10%,rgba(14,165,233,0.18),transparent_62%),radial-gradient(720px_440px_at_88%_6%,rgba(16,185,129,0.14),transparent_64%),linear-gradient(180deg,#f8fbff_0%,#eef6ff_54%,#f8fafc_100%)] px-6 text-slate-950"
			role="status"
			aria-busy="true"
			aria-live="polite"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.18 }}
		>
			<div className="w-full max-w-md rounded-[0.75rem] border border-slate-200 bg-white/82 p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
				<div
					className="mx-auto mb-6 size-3 animate-pulse rounded-full bg-sky-500 shadow-lg shadow-sky-400/30"
					aria-hidden="true"
				/>
				<p className="font-mono font-semibold text-[0.7rem] text-sky-700 uppercase tracking-[0.28em]">
					AzurAuto
				</p>
				<h1 className="mt-4 font-semibold text-2xl text-slate-950">
					正在准备本地资源
				</h1>
				<p className="mt-3 text-slate-600 text-sm leading-7">
					正在检查脚本运行需要的本地资源
				</p>
				<div className="mt-6 rounded-[0.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-center">
					<p className="font-mono text-[0.68rem] text-slate-500 uppercase tracking-[0.14em]">
						Resource status
					</p>
					<p className="mt-2 min-h-5 text-slate-700 text-sm">
						{status?.message ?? "马上就好..."}
					</p>
				</div>
			</div>
		</motion.div>
	);
}
