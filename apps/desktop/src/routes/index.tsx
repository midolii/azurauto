import { createFileRoute } from "@tanstack/react-router";
import { EnvironmentStatusSection } from "../components/home/environment-status-section";
import { PreviewSection } from "../components/home/preview/preview-section";
import { useEnvironmentBootstrap } from "../hooks/use-environment-bootstrap";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const { status, isRetrying, retryBootstrap } = useEnvironmentBootstrap();

	return (
		<div className="min-h-screen bg-slate-950 p-6 text-slate-100">
			<main className="mx-auto max-w-6xl space-y-6">
				<header className="space-y-2">
					<p className="text-sm text-cyan-300">AzurAuto Desktop</p>
					<h1 className="text-2xl font-bold">自动化环境检查</h1>
					<p className="text-slate-400">
						打开应用后会自动检查模拟器 ADB 和
						ATX（小黄车自动化）组件，环境就绪后才能运行后续游戏自动化能力。
					</p>
				</header>

				<EnvironmentStatusSection
					status={status}
					isRetrying={isRetrying}
					onRetry={retryBootstrap}
				/>
				<PreviewSection status={status} />
			</main>
		</div>
	);
}
