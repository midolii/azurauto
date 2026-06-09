# Android runtime resources

此目录由 `pnpm --filter desktop resources` 管理，用于 Electron 打包时随应用分发 Android native 资源。

自动生成：

- `platform-tools/<platform>/adb`：内置 ADB。
- `scrcpy-server.bin`：设备端 scrcpy server。
- `u2.jar`：uiautomator2 JSON-RPC server，截图服务会自动 push 到 `/data/local/tmp/u2.jar`。
- `manifest.json`：资源清单。

可选手动放置：

- `atx-agent.apk`：ATX / uiautomator APK，存在时 bootstrap 会优先使用它自动安装。

这些二进制文件不提交到 git；构建安装包前会自动准备。
