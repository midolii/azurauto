import type { BootstrapStatus } from "@azurauto/automation";
import { useCallback, useEffect, useState } from "react";
import type { StartupResourceStatus } from "../../electron/ipc/contract/index.ts";
import {
	desktopPlatform,
	type PlatformCapabilities,
} from "../platform/index.ts";
import { desktopStore } from "../stores/desktop-store.ts";

export function useEnvironmentBootstrap() {
	const [status, setStatus] = useState<BootstrapStatus | null>(null);
	const [resourceStatus, setResourceStatus] =
		useState<StartupResourceStatus | null>(null);
	const [capabilities, setCapabilities] = useState<PlatformCapabilities>(() =>
		desktopPlatform.getCapabilities(),
	);
	const [isRetrying, setIsRetrying] = useState(false);
	const [isPreparingResources, setIsPreparingResources] = useState(false);

	const refreshCapabilities = useCallback(() => {
		setCapabilities(desktopPlatform.getCapabilities());
	}, []);

	const prepareResources = useCallback(async () => {
		setIsPreparingResources(true);
		try {
			const nextResourceStatus =
				await desktopPlatform.environment.prepareResources();
			setResourceStatus(nextResourceStatus);
			desktopStore.setResourceStatus(nextResourceStatus);
		} finally {
			refreshCapabilities();
			setIsPreparingResources(false);
		}
	}, [refreshCapabilities]);

	useEffect(() => {
		let cancelled = false;

		async function loadStatus() {
			const [nextStatus, nextResourceStatus] = await Promise.all([
				desktopPlatform.environment.getBootstrapStatus(),
				desktopPlatform.environment.getResourceStatus(),
			]);
			if (!cancelled) {
				setStatus(nextStatus);
				setResourceStatus(nextResourceStatus);
				desktopStore.setResourceStatus(nextResourceStatus);
				refreshCapabilities();
			}
		}

		void prepareResources();
		void loadStatus();
		const timer = window.setInterval(loadStatus, 1500);

		return () => {
			cancelled = true;
			window.clearInterval(timer);
		};
	}, [prepareResources, refreshCapabilities]);

	async function retryBootstrap() {
		setIsRetrying(true);
		try {
			setStatus(await desktopPlatform.environment.runBootstrap());
		} finally {
			refreshCapabilities();
			setIsRetrying(false);
		}
	}

	return {
		status,
		resourceStatus,
		capabilities,
		isRetrying,
		isPreparingResources,
		prepareResources,
		retryBootstrap,
	};
}
