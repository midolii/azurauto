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
		<section className={cn("flex min-h-full flex-col gap-5", className)}>
			{showHeader ? (
				<header className="px-1 pb-2">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
						<div className="min-w-0">
							{kicker ? <p className="command-kicker mb-2">{kicker}</p> : null}
							<h1 className="font-bold text-2xl text-slate-950 tracking-tight">
								{title}
							</h1>
							{description ? (
								<p className="mt-2 max-w-3xl text-slate-600 text-sm leading-6">
									{description}
								</p>
							) : null}
						</div>
					</div>
				</header>
			) : null}

			<div className="flex min-h-0 flex-1 flex-col px-1">{children}</div>
		</section>
	);
}
