// Electron Builder 配置独立于 package.json，避免 package.json 同时承载脚本和打包细节。
// 所有路径均以 apps/desktop 为 projectDir；build/build.mjs 会通过 --config 显式加载本文件。

module.exports = {
	appId: "net.midolii.azurauto",
	productName: "azurauto",
	executableName: "azurauto",
	icon: "public/icon",
	directories: {
		output: "release",
		buildResources: "public",
	},
	files: ["electron/**/*", "package.json"],
	extraResources: [
		{
			from: ".output",
			to: ".output",
		},
		{
			from: "resources/android",
			to: "android",
		},
	],
	mac: {
		identity: null,
		icon: "public/icon.icns",
		extendInfo: {
			CFBundleName: "azurauto",
			CFBundleDisplayName: "azurauto",
		},
		target: ["dmg", "zip"],
	},
	win: {
		icon: "public/icon.ico",
		target: ["nsis"],
	},
	linux: {
		icon: "public/icon.png",
		target: ["AppImage"],
	},
};
