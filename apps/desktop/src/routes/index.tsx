import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EnvironmentStatusSection } from "../components/home/environment-status-section";
import { PreviewSection } from "../components/home/preview/preview-section";
import { StartupLoadingScreen } from "../components/home/startup-loading-screen";
import { useEnvironmentBootstrap } from "../hooks/use-environment-bootstrap";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const { status, isRetrying, retryBootstrap } = useEnvironmentBootstrap();
	const reduceMotion = useReducedMotion();
	const isPreparing =
		!status ||
		[
			"idle",
			"checking-adb",
			"adb-recovering",
			"checking-atx",
			"installing-atx",
		].includes(status.phase);

	return (
		<div className="min-h-screen bg-slate-950 text-slate-100">
			<AnimatePresence initial={false}>
				{isPreparing ? (
					<StartupLoadingScreen key="startup-loading" status={status} />
				) : (
					<motion.div
						key="home-main"
						className="min-h-screen bg-slate-950 p-6 text-slate-100"
						initial={
							reduceMotion
								? { opacity: 1 }
								: { opacity: 0, y: 16, filter: "blur(6px)" }
						}
						animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
						exit={{ opacity: 0 }}
						transition={{
							duration: reduceMotion ? 0 : 0.45,
							ease: [0.22, 1, 0.36, 1],
						}}
					>
						<main className="mx-auto max-w-6xl space-y-6">
							<header className="space-y-2">
								<p className="text-cyan-300 text-sm">AzurAuto Desktop</p>
								<h1 className="font-bold text-2xl">自动化环境检查</h1>
								<p className="text-slate-400">
									打开应用后会自动检查模拟器 ADB 和
									ATX（小黄车自动化）组件，环境就绪后才能运行后续游戏自动化能力。
								</p>
							</header>

							<EnvironmentStatusSection
								status={status}
								isRetrying={isRetrying}
								onRetry={retryBootstrap}
							/>
							<PreviewSection status={status} />
						</main>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
