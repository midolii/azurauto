import { TanStackDevtools } from "@tanstack/react-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import TanStackQueryDevtools from "../../integrations/tanstack-query/devtools";

/**
 * 开发环境专用调试工具实现。
 * 该文件只能被 AppDevtools 在 import.meta.env.DEV 分支中动态加载，避免生产包直接引用 devtools 依赖。
 */
export function AppDevtoolsImpl() {
	return (
		<TanStackDevtools
			config={{
				position: "bottom-right",
			}}
			plugins={[
				{
					name: "Tanstack Router",
					render: <TanStackRouterDevtoolsPanel />,
				},
				TanStackQueryDevtools,
			]}
		/>
	);
}
