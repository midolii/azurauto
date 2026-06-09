import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar.tsx";
import { type DesktopPage, useDesktopStore } from "#/stores/desktop-store.ts";
import { AppSidebar } from "./app-sidebar.tsx";

interface ShellPage {
	id: DesktopPage;
	content: ReactNode;
}

interface DesktopAppShellProps {
	pages: ShellPage[];
}

export function DesktopAppShell({ pages }: DesktopAppShellProps) {
	const activePage = useDesktopStore((state) => state.activePage);
	const reduceMotion = useReducedMotion();
	const activePageContent = pages.find(
		(page) => page.id === activePage,
	)?.content;

	return (
		<SidebarProvider className="min-h-screen overflow-hidden bg-(--command-bg) text-slate-950">
			<AppSidebar />
			<SidebarInset className="h-screen overflow-hidden border-slate-200 border-l bg-white/54">
				<div className="relative h-full overflow-hidden bg-transparent">
					<div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-slate-200" />
					<motion.div
						key={activePage}
						className="absolute inset-0 min-h-0 overflow-auto px-7 py-6 lg:px-8"
						initial={reduceMotion ? false : { opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: reduceMotion ? 0 : 0.08, ease: "linear" }}
					>
						{activePageContent}
					</motion.div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
