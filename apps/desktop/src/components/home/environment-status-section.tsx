import type { BootstrapStatus } from "@azurauto/automation";
import { LoaderCircle } from "lucide-react";
import { Button } from "#/components/ui/button.tsx";
import { getPhaseCopy } from "../../utils/environment-copy";
import { StatusItem } from "./status-item";

export function EnvironmentStatusSection({
	status,
	isRetrying,
	onRetry,
	actionLabel = "重新检查",
	retryingLabel = "重试中...",
}: {
	status: BootstrapStatus | null;
	isRetrying: boolean;
	onRetry(): void;
	actionLabel?: string;
	retryingLabel?: string;
}) {
	const phaseCopy = getPhaseCopy(status);

	return (
		<section className="rounded-xl bg-white/82 p-5 shadow-sm ring-1 ring-slate-200">
			<div className="flex items-start justify-between gap-4 border-slate-200 border-b pb-4">
				<div className="space-y-2">
					<span
						className={`inline-flex border-l-2 px-3 py-1 font-medium text-xs ${phaseCopy.badgeClass}`}
					>
						{phaseCopy.label}
					</span>
					<h2 className="font-semibold text-lg text-slate-950">
						{status?.message ?? "正在读取环境状态..."}
					</h2>
					<p className="text-slate-600 text-sm">{phaseCopy.description}</p>
				</div>

				<Button
					type="button"
					className="shrink-0"
					disabled={!status?.recoverable || isRetrying}
					onClick={onRetry}
				>
					{isRetrying ? (
						<LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
					) : null}
					{isRetrying ? retryingLabel : actionLabel}
				</Button>
			</div>

			<dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
				<StatusItem label="当前阶段" value={status?.phase ?? "loading"} />
				<StatusItem
					label="设备 Serial"
					value={status?.serial ?? "未选择设备"}
				/>
				<StatusItem label="错误码" value={status?.errorCode ?? "无"} />
				<StatusItem
					label="更新时间"
					value={status ? new Date(status.updatedAt).toLocaleString() : "-"}
				/>
			</dl>

			{status?.nextAction ? (
				<div className="mt-5 border-sky-300 border-l-2 bg-sky-50 px-4 py-3 text-sky-900 text-sm">
					下一步：{status.nextAction}
				</div>
			) : null}

			<div className="mt-3 border-slate-300 border-l-2 bg-slate-50 px-4 py-3 text-slate-600 text-xs">
				AzurAuto 会使用专用 ADB server 端口自动恢复连接，不会重启系统默认 ADB
				服务。
			</div>
		</section>
	);
}
