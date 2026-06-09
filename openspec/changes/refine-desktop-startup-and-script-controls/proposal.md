## Why

The desktop app should separate lightweight application startup from ADB/script execution so opening the app does not immediately connect to devices or start automation-related work. For an ADB game scripting workflow, the app needs distinct lifecycles for resource preparation, device bootstrap, script runtime, and preview/debug streaming.

桌面端应用需要将轻量启动流程与 ADB/脚本执行解耦，避免应用打开后自动连接设备或启动自动化相关工作。对于 ADB 游戏脚本工作流，应用需要明确拆分资源准备、设备 bootstrap、脚本运行态、预览/调试流这几个生命周期。

## What Changes

- Add icon-only Start and Pause controls to the top sidebar area to represent whether the script runtime is running.
  - 在 sidebar 顶部添加仅图标的开始和暂停按钮，用于表示脚本是否正在运行。
- Add a new Home page that shows welcome content and hides the content-top title/description card for that page.
  - 新增首页，展示欢迎语，并在该页面隐藏内容顶部 title/desc 卡片区域。
- Move the current automation/environment check page from Home into a Debug page.
  - 将当前首页的自动化/环境检查页面迁移为 Debug 调试页面。
- Update startup loading so it only verifies required local resource files that must be pushed to ADB devices, such as uiautomator2 and scrcpy-server, and downloads missing resources from the network.
  - 更新 loading 逻辑，使其只检查需要 push 到 ADB 设备的本地资源文件，例如 uiautomator2、scrcpy-server；如果资源不存在，则从网络下载。
- Include all required local runtime resources in startup preparation, including atx-agent APK and bundled ADB if they are needed by the runtime.
  - 启动资源准备需要覆盖所有运行时本地资源，包括运行时需要的 atx-agent APK 和内置 ADB。
- Use bounded download/retry behavior, version/checksum validation, and atomic writes for downloaded resources.
  - 下载资源时使用有边界的重试/超时、版本/校验和验证，以及原子写入，避免资源损坏或 loading 永久卡住。
- Keep the loading flow extensible for future checks such as script update detection.
  - 保持 loading 流程可扩展，后续可以增加脚本是否需要更新等检查。
- Prevent app startup from automatically connecting to ADB.
  - 应用打开时不自动连接 ADB。
- Connect to ADB only when the user clicks the sidebar Start control.
  - 仅当用户点击 sidebar 顶部开始按钮时才连接 ADB。
- Add an explicit Debug connect/recheck action for ADB/device diagnostics, since app startup no longer performs ADB bootstrap automatically.
  - 在 Debug 页面添加显式连接/重新检查 ADB 的操作，因为应用启动不再自动执行 ADB bootstrap。
- Show or confirm the selected target device serial when connecting, leaving room for multi-device selection.
  - 连接设备时显示或确认选中的目标设备 serial，并为后续多设备选择预留空间。
- When starting, automatically begin uiautomator screenshot capture for future OCR processing.
  - 点击开始后自动启动 uiautomator 截图，用于后续脚本 OCR 逻辑处理。
- Own runtime screenshot capture in a runtime/main-process service with cancellation, rather than coupling it to the Debug preview component lifecycle.
  - 运行态截图采集由 runtime/main-process service 管理并支持取消，不与 Debug 预览组件生命周期耦合。
- Do not automatically start the scrcpy video stream when the script starts.
  - 脚本启动时不主动开启 scrcpy 视频流。
- Define Pause as suspending script runtime and OCR screenshot capture while keeping device/uiautomator resources warm; reserve full teardown for a future Stop action.
  - 将 Pause 定义为暂停脚本运行和 OCR 截图采集，同时保留设备/uiautomator warm 状态；完整释放资源预留给后续 Stop 操作。

## Capabilities

### New Capabilities
- `desktop-script-runtime-controls`: Covers sidebar start/pause controls, explicit ADB connection startup, selected device visibility, runtime-owned uiautomator screenshot capture, pause semantics, and non-automatic scrcpy behavior.
- `desktop-home-debug-navigation`: Covers the new welcome Home page, migration of environment checks to Debug, explicit Debug connect/recheck behavior, and per-page header visibility.
- `desktop-resource-startup-loading`: Covers startup resource validation/download, checksum/version-safe local resource preparation, bounded retry behavior, and extensible non-ADB loading checks before the app becomes ready.

### Modified Capabilities

## Impact

- Affects desktop sidebar UI, page navigation, home/debug page composition, startup/loading hooks, and environment/bootstrap behavior.
- Requires separating resource preparation from ADB/device bootstrap so startup can complete without connecting to a device.
- May require adjusting Electron preload/IPC contracts or automation services for resource preparation, explicit device bootstrap, selected device state, and runtime screenshot capture cancellation.
- May require adding client/runtime state for resource readiness, device readiness, script runtime status, screenshot capture lifecycle, and manual scrcpy preview state.
- No persistent database changes are expected.
