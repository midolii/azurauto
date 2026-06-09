import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { DesktopAppShell } from "../components/app-shell/desktop-app-shell";
import { StartupLoadingScreen } from "../components/home/startup-loading-screen";
import { useEnvironmentBootstrap } from "../hooks/use-environment-bootstrap";
import { desktopStore } from "../stores/desktop-store";
import { DebugPage } from "./~pages/debug-page";
import { HomePage } from "./~pages/home-page";
import { SettingsPage } from "./~pages/settings-page";
import { TaskExecutionPage } from "./~pages/task-execution-page";

export const Route = createFileRoute("/")({ component: Home });

interface ShellPageConfig {
	id: "home" | "debug" | "tasks" | "settings";
	content: ReactNode;
}

interface MainShellProps {
	status: ReturnType<typeof useEnvironmentBootstrap>["status"];
	isRetrying: boolean;
	onConnect(): void;
	reduceMotion: boolean | null;
}

function Home() {
	useLoggerSubscription();
	const {
		status,
		resourceStatus,
		isRetrying,
		isPreparingResources,
		retryBootstrap,
	} = useEnvironmentBootstrap();
	const reduceMotion = useReducedMotion();
	const shouldShowStartupLoading =
		!resourceStatus ||
		(isPreparingResources && !resourceStatus.ready) ||
		resourceStatus.phase === "checking" ||
		resourceStatus.phase === "downloading";

	return (
		<div className="min-h-screen text-slate-950">
			<AnimatePresence initial={false}>
				{shouldShowStartupLoading ? (
					<StartupLoadingScreen key="startup-loading" status={resourceStatus} />
				) : (
					<MainShell
						status={status}
						isRetrying={isRetrying}
						onConnect={retryBootstrap}
						reduceMotion={reduceMotion}
					/>
				)}
			</AnimatePresence>
		</div>
	);
}

function useLoggerSubscription() {
	useEffect(() => {
		let cancelled = false;

		void window.logger.getEntries().then((entries) => {
			if (!cancelled) {
				desktopStore.setLogs(entries);
			}
		});

		const unsubscribe = window.logger.onEntry((entry) => {
			desktopStore.appendLog(entry);
		});

		return () => {
			cancelled = true;
			unsubscribe();
		};
	}, []);
}

function MainShell({
	status,
	isRetrying,
	onConnect,
	reduceMotion,
}: MainShellProps) {
	return (
		<motion.div
			key="home-main"
			className="min-h-screen"
			initial={getMainInitialState(reduceMotion)}
			animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
			exit={{ opacity: 0 }}
			transition={{
				duration: reduceMotion ? 0 : 0.45,
				ease: [0.22, 1, 0.36, 1],
			}}
		>
			<DesktopAppShell
				pages={getShellPages({ status, isRetrying, onConnect })}
			/>
		</motion.div>
	);
}

function getMainInitialState(reduceMotion: boolean | null) {
	return reduceMotion
		? { opacity: 1 }
		: { opacity: 0, y: 16, filter: "blur(6px)" };
}

function getShellPages({
	status,
	isRetrying,
	onConnect,
}: Omit<MainShellProps, "reduceMotion">): ShellPageConfig[] {
	return [
		{
			id: "home",
			content: <HomePage />,
		},
		{
			id: "debug",
			content: (
				<DebugPage
					status={status}
					isRetrying={isRetrying}
					onConnect={onConnect}
				/>
			),
		},
		{
			id: "tasks",
			content: <TaskExecutionPage />,
		},
		{
			id: "settings",
			content: <SettingsPage />,
		},
	];
}
