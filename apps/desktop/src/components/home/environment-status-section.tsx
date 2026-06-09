import type { BootstrapStatus } from "@azurauto/automation";
import { getPhaseCopy } from "../../utils/environment-copy";
import { StatusItem } from "./status-item";

export function EnvironmentStatusSection({
	status,
	isRetrying,
	onRetry,
}: {
	status: BootstrapStatus | null;
	isRetrying: boolean;
	onRetry(): void;
}) {
	const phaseCopy = getPhaseCopy(status);

	return (
		<section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
			<div className="flex items-start justify-between gap-4">
				<div className="space-y-2">
					<span
						className={`inline-flex rounded-full px-3 py-1 text-sm ${phaseCopy.badgeClass}`}
					>
						{phaseCopy.label}
					</span>
					<h2 className="font-semibold text-lg">
						{status?.message ?? "正在读取环境状态..."}
					</h2>
					<p className="text-slate-400 text-sm">{phaseCopy.description}</p>
				</div>

				<button
					type="button"
					className="rounded-lg bg-cyan-500 px-4 py-2 font-medium text-slate-950 text-sm disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
					disabled={!status?.recoverable || isRetrying}
					onClick={onRetry}
				>
					{isRetrying ? "重试中..." : "重新检查"}
				</button>
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
				<div className="mt-5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-cyan-100 text-sm">
					下一步：{status.nextAction}
				</div>
			) : null}

			<div className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3 text-cyan-100/80 text-xs">
				AzurAuto 会使用专用 ADB server 端口自动恢复连接，不会重启系统默认 ADB
				服务。
			</div>
		</section>
	);
}
