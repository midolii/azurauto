import type { BootstrapStatus } from "@azurauto/automation";
import { useCallback, useEffect, useState } from "react";
import type { StartupResourceStatus } from "../../electron/ipc/contract/index.ts";
import { desktopStore } from "../stores/desktop-store.ts";

export function useEnvironmentBootstrap() {
	const [status, setStatus] = useState<BootstrapStatus | null>(null);
	const [resourceStatus, setResourceStatus] =
		useState<StartupResourceStatus | null>(null);
	const [isRetrying, setIsRetrying] = useState(false);
	const [isPreparingResources, setIsPreparingResources] = useState(false);

	const prepareResources = useCallback(async () => {
		setIsPreparingResources(true);
		try {
			const nextResourceStatus = await window.environment.prepareResources();
			setResourceStatus(nextResourceStatus);
			desktopStore.setResourceStatus(nextResourceStatus);
		} finally {
			setIsPreparingResources(false);
		}
	}, []);

	useEffect(() => {
		let cancelled = false;

		async function loadStatus() {
			const [nextStatus, nextResourceStatus] = await Promise.all([
				window.environment.getBootstrapStatus(),
				window.environment.getResourceStatus(),
			]);
			if (!cancelled) {
				setStatus(nextStatus);
				setResourceStatus(nextResourceStatus);
				desktopStore.setResourceStatus(nextResourceStatus);
			}
		}

		void prepareResources();
		void loadStatus();
		const timer = window.setInterval(loadStatus, 1500);

		return () => {
			cancelled = true;
			window.clearInterval(timer);
		};
	}, [prepareResources]);

	async function retryBootstrap() {
		setIsRetrying(true);
		try {
			setStatus(await window.environment.runBootstrap());
		} finally {
			setIsRetrying(false);
		}
	}

	return {
		status,
		resourceStatus,
		isRetrying,
		isPreparingResources,
		prepareResources,
		retryBootstrap,
	};
}
