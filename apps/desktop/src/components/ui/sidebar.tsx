import type * as React from "react";

import { cn } from "#/lib/utils.ts";

function SidebarProvider({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-provider"
			className={cn("flex min-h-screen w-full bg-background", className)}
			{...props}
		/>
	);
}

function Sidebar({ className, ...props }: React.ComponentProps<"aside">) {
	return (
		<aside
			data-slot="sidebar"
			className={cn(
				"flex h-screen w-72 shrink-0 flex-col border-sidebar-border border-r bg-sidebar text-sidebar-foreground",
				className,
			)}
			{...props}
		/>
	);
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-header"
			className={cn("flex flex-col gap-3 p-4", className)}
			{...props}
		/>
	);
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-content"
			className={cn("flex min-h-0 flex-1 flex-col gap-2 px-3", className)}
			{...props}
		/>
	);
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-footer"
			className={cn("mt-auto flex flex-col gap-2 p-3", className)}
			{...props}
		/>
	);
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-group"
			className={cn("flex flex-col gap-2 py-2", className)}
			{...props}
		/>
	);
}

function SidebarGroupLabel({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-group-label"
			className={cn(
				"px-2 font-medium font-mono text-[0.66rem] text-slate-500 uppercase tracking-[0.18em]",
				className,
			)}
			{...props}
		/>
	);
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"nav">) {
	return (
		<nav
			data-slot="sidebar-menu"
			className={cn("flex flex-col gap-1", className)}
			{...props}
		/>
	);
}

function SidebarMenuButton({
	className,
	isActive = false,
	...props
}: React.ComponentProps<"button"> & { isActive?: boolean }) {
	return (
		<button
			data-slot="sidebar-menu-button"
			data-active={isActive}
			className={cn(
				"flex w-full cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left font-medium text-slate-600 text-sm outline-none transition-all duration-150 ease-out hover:border-sky-200 hover:bg-sky-50 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar active:scale-[0.98] active:border-sky-300 active:bg-sky-100",
				isActive &&
					"border-sky-200 bg-sky-50 text-sky-900 shadow-[0_10px_30px_rgba(2,132,199,0.08)] hover:bg-sky-50 hover:text-sky-900",
				className,
			)}
			{...props}
		/>
	);
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
	return (
		<main
			data-slot="sidebar-inset"
			className={cn("min-w-0 flex-1", className)}
			{...props}
		/>
	);
}

export {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarProvider,
};
