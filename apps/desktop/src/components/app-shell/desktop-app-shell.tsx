import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "#/components/ui/sidebar.tsx";
import { cn } from "#/lib/utils.ts";
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

	return (
		<SidebarProvider className="min-h-screen overflow-hidden bg-transparent text-slate-950 dark:text-slate-50">
			<AppSidebar />
			<SidebarInset className="h-screen overflow-hidden">
				<div className="relative h-full overflow-hidden border border-white/70 bg-white/45 shadow-[0_24px_70px_rgba(17,58,64,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60">
					{pages.map((page) => {
						const isActive = page.id === activePage;

						return (
							<motion.div
								key={page.id}
								aria-hidden={!isActive}
								className={cn(
									"absolute inset-0 min-h-0 overflow-auto px-6 py-6 will-change-transform",
									!isActive && "pointer-events-none",
								)}
								initial={false}
								animate={
									isActive
										? { opacity: 1, y: 0 }
										: reduceMotion
											? { opacity: 0, y: 0 }
											: { opacity: 0, y: 8 }
								}
								transition={{
									duration: reduceMotion ? 0 : 0.16,
									ease: "easeOut",
								}}
								style={{ zIndex: isActive ? 1 : 0 }}
							>
								{page.content}
							</motion.div>
						);
					})}
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
