import type { BootstrapStatus } from "@azurauto/automation";

export function getPhaseCopy(status: BootstrapStatus | null) {
	switch (status?.phase) {
		case "ready":
			return {
				label: "已就绪",
				description: "模拟器和 ATX 已可用，可以继续接入后续截图自动化能力。",
				badgeClass: "border-emerald-500 bg-emerald-50 text-emerald-700",
			};
		case "no-adb":
			return {
				label: "ADB 缺失",
				description: "请安装 Android platform-tools，或确认 adb 已加入 PATH。",
				badgeClass: "border-amber-500 bg-amber-50 text-amber-700",
			};
		case "no-device":
			return {
				label: "未发现模拟器",
				description:
					"请打开模拟器；如果设备未授权或 offline，请确认授权并重启连接。",
				badgeClass: "border-amber-500 bg-amber-50 text-amber-700",
			};
		case "installing-atx":
			return {
				label: "正在安装 ATX",
				description: "正在向设备安装小黄车自动化组件，请不要关闭模拟器。",
				badgeClass: "border-sky-500 bg-sky-50 text-sky-700",
			};
		case "adb-recovering":
			return {
				label: "恢复 ADB 中",
				description: "正在启动或重启 ADB 服务，然后重新检查设备列表。",
				badgeClass: "border-amber-500 bg-amber-50 text-amber-700",
			};
		case "failed":
			return {
				label: "检查失败",
				description: "自动修复失败，请根据提示处理安装包、权限或设备连接问题。",
				badgeClass: "border-rose-500 bg-rose-50 text-rose-700",
			};
		case "checking-adb":
		case "checking-atx":
			return {
				label: "检查中",
				description: "正在检查 ADB 设备与 ATX 安装状态。",
				badgeClass: "border-sky-500 bg-sky-50 text-sky-700",
			};
		default:
			return {
				label: "加载中",
				description: "正在从 native 环境读取当前状态。",
				badgeClass: "border-slate-400 bg-slate-50 text-slate-600",
			};
	}
}
