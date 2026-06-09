const { contextBridge, ipcRenderer } = require("electron");

const ipcChannels = {
	environmentGetBootstrapStatus: "environment:getBootstrapStatus",
	environmentRunBootstrap: "environment:runBootstrap",
	environmentCaptureScreenshot: "environment:captureScreenshot",
};

const environment = {
	getBootstrapStatus: () =>
		ipcRenderer.invoke(ipcChannels.environmentGetBootstrapStatus),
	runBootstrap: () => ipcRenderer.invoke(ipcChannels.environmentRunBootstrap),
	captureScreenshot: () =>
		ipcRenderer.invoke(ipcChannels.environmentCaptureScreenshot),
};

// 正式 preload 只暴露环境检查 API，避免把测试用 ADB 操作能力泄露给渲染进程。
contextBridge.exposeInMainWorld("environment", environment);
