import type { BootstrapStatus } from "@azurauto/automation";

import { PageFrame } from "#/components/app-shell/page-frame.tsx";
import { EnvironmentStatusSection } from "#/components/home/environment-status-section.tsx";
import { PreviewSection } from "#/components/home/preview/preview-section.tsx";

interface DebugPageProps {
	status: BootstrapStatus | null;
	isRetrying: boolean;
	onConnect(): void;
}

export function DebugPage({ status, isRetrying, onConnect }: DebugPageProps) {
	return (
		<PageFrame
			kicker="Debug"
			title="自动化调试"
			description="手动连接或重新检查 ADB/ATX 环境，并按需开启 uiautomator 或 scrcpy 预览。应用启动阶段不会自动连接 ADB。"
		>
			<div className="mx-auto max-w-6xl space-y-6">
				<EnvironmentStatusSection
					status={status}
					isRetrying={isRetrying}
					onRetry={onConnect}
					actionLabel="连接 / 重新检查 ADB"
					retryingLabel="连接中..."
				/>
				<PreviewSection status={status} />
			</div>
		</PageFrame>
	);
}
