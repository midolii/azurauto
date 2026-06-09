import type { BootstrapStatus } from "@azurauto/automation";
import { useEffect, useState } from "react";

export function useEnvironmentBootstrap() {
	const [status, setStatus] = useState<BootstrapStatus | null>(null);
	const [isRetrying, setIsRetrying] = useState(false);

	useEffect(() => {
		let cancelled = false;

		async function loadStatus() {
			const nextStatus = await window.environment.getBootstrapStatus();
			if (!cancelled) {
				setStatus(nextStatus);
			}
		}

		void loadStatus();
		const timer = window.setInterval(loadStatus, 1500);

		return () => {
			cancelled = true;
			window.clearInterval(timer);
		};
	}, []);

	async function retryBootstrap() {
		setIsRetrying(true);
		try {
			setStatus(await window.environment.runBootstrap());
		} finally {
			setIsRetrying(false);
		}
	}

	return { status, isRetrying, retryBootstrap };
}
