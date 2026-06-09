import type { ReactNode } from "react";

import { cn } from "#/lib/utils.ts";

interface PageFrameProps {
	title: string;
	description?: string;
	kicker?: string;
	children: ReactNode;
	className?: string;
	showHeader?: boolean;
}

export function PageFrame({
	title,
	description,
	kicker,
	children,
	className,
	showHeader = true,
}: PageFrameProps) {
	return (
		<section className={cn("flex min-h-full flex-col gap-6", className)}>
			{showHeader ? (
				<header className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5">
					{kicker ? (
						<p className="mb-2 font-semibold text-[0.7rem] text-cyan-700 uppercase tracking-[0.18em] dark:text-cyan-300">
							{kicker}
						</p>
					) : null}
					<h1 className="font-bold text-2xl text-slate-950 tracking-tight dark:text-slate-50">
						{title}
					</h1>
					{description ? (
						<p className="mt-2 max-w-3xl text-slate-600 text-sm leading-6 dark:text-slate-300">
							{description}
						</p>
					) : null}
				</header>
			) : null}

			<div className="flex-1 rounded-3xl border border-white/60 bg-white/55 p-6 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5">
				{children}
			</div>
		</section>
	);
}
