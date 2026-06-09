import { lazy, Suspense } from "react";

const LazyAppDevtools = import.meta.env.DEV
	? lazy(() =>
			import("./impl").then((module) => ({
				default: module.AppDevtoolsImpl,
			})),
		)
	: null;

/**
 * 统一管理应用调试工具入口。
 * 仅开发环境动态加载，生产构建不显示也不应直接打包 devtools 实现。
 */
export function AppDevtools() {
	if (!LazyAppDevtools) {
		return null;
	}

	return (
		<Suspense fallback={null}>
			<LazyAppDevtools />
		</Suspense>
	);
}
