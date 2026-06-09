## Context

当前桌面端是 Electron + Vite + TanStack Start 架构，Electron 主进程位于 `apps/desktop/electron`，渲染层通过 preload 暴露的 `window.bot` 调用 IPC，底层 ADB 能力集中在 `packages/adb`。现有 `window.bot.tap`、`window.bot.swipe`、`window.bot.screenshot` 以及对应 native IPC 方法主要是联调用测试接口，不应作为长期稳定产品接口保留；现有 ADB 封装只支持三类直接命令，默认用户已经准备好可用设备和自动化环境。

新的启动检查需要解决三个问题：

1. 用户打开桌面应用时，系统必须确认本机 `adb` 可执行，并能发现至少一台处于 `device` 状态的模拟器/设备。
2. 目标设备必须具备 ATX（小黄车自动化）能力；缺失时应自动安装或初始化，避免后续截图自动化、控件自动化和游戏脚本运行失败。
3. 相关代码不能堆在单个 Electron 文件里，需要形成“底层命令能力 → 设备/ATX 服务 → Electron native 编排 → IPC/preload → 渲染 UI”的分层，便于后续扩展游戏截图、图像识别、自动化任务队列等能力。

## Goals / Non-Goals

**Goals:**

- 应用启动时自动执行 ADB 与 ATX bootstrap，并把当前阶段、成功状态、错误原因和恢复建议持久地暴露给渲染层。
- 将 ADB 命令能力沉淀到 `packages/adb`，避免 Electron 层直接拼接命令。
- 清理当前 `window.bot` 上的测试 native 方法，改为暴露面向环境 bootstrap 和后续自动化能力的稳定 API。
- 允许并优先考虑在 `packages/adb` 内封装成熟第三方 ADB 库，应用层只依赖本项目定义的适配接口，避免被第三方 API 直接污染。
- 在 Electron native 层增加设备环境服务，负责编排设备选择、ATX 检测、安装、重试和状态发布。
- 设计面向后续截图自动化的扩展接口：设备会话、截图能力、自动化运行前置条件检查、结构化错误。
- 在关键模块和复杂状态流转处添加中文注释，说明为什么这样分层以及异常如何恢复。

**Non-Goals:**

- 不在本变更中实现完整游戏脚本、图像识别、OCR 或任务调度系统。
- 不支持多设备并发自动化；本阶段只选择一台默认目标设备，但接口需保留设备 ID。
- 不实现跨平台 ADB 安装器；如果本机找不到 `adb`，只返回明确错误和引导信息。
- 不把 ATX 安装过程强绑定到某个 UI 页面；渲染层只消费状态并展示反馈。
- 不要求保留当前测试用途的 `window.bot` API；如果实现阶段仍需临时调试能力，应放在开发环境专用入口中。

## Decisions

### 1. 底层 ADB 能力继续放在 `packages/adb`，并通过适配层封装第三方库

`packages/adb` 应扩展为可复用的 ADB 适配层。实现时可以优先选择成熟第三方 ADB 库来处理设备连接、命令执行、安装和数据流，必要时保留 CLI fallback；但 Electron 和自动化服务只能依赖本项目导出的接口，不能直接依赖第三方库 API。

该适配层提供：

- `listDevices()`：解析 `adb devices`，返回设备 ID、连接状态和原始行信息。
- `shell(serial, command)`：在指定设备上执行 shell 命令。
- `isPackageInstalled(serial, packageName)`：通过 `pm path` 或 `cmd package list packages` 检测包是否存在。
- `installApk(serial, apkPath)` 或 `installPackage(serial, source)`：封装安装命令。
- `screenshot(serial)`、`tap(serial, ...)`、`swipe(serial, ...)`：为后续多设备场景预留 serial 参数。
- 统一命令超时、stdout/stderr、exit code 和错误分类。

理由：ADB 是跨 Electron/native 和未来自动化 package 共享的底层能力，放在 package 层可以被后续截图分析、自动化 runner 和测试复用。通过项目自有适配层封装第三方库，可以利用成熟实现，同时保留替换底层库的能力。备选方案一是直接在 Electron main 中调用 `exec`，但会导致启动流程、命令拼接和业务状态耦合；备选方案二是在业务层直接调用第三方库，但会让第三方 API 扩散到 native、IPC 和自动化层，后续迁移困难。

### 2. ATX 检测/安装抽象为自动化环境服务，而不是散落在 UI 或 IPC handler 中

建议在 `packages/automation` 或 `packages/adb` 的上层新增自动化环境模块，例如：

- `DeviceBootstrapService`：负责完整启动检查流程。
- `AtxService` / `AtxInstaller`：负责 ATX 是否安装、版本检查、安装/初始化。
- `DeviceSession`：保存当前选择的 serial、设备能力和最后一次检查结果。

Electron 主进程只负责创建服务实例并在 `app.whenReady()` 后启动检查。渲染层通过 IPC 获取状态或触发重试，不直接了解安装命令细节。

理由：ATX 是自动化领域能力，不是纯 ADB 原语；抽象成服务后，后续可以加入截图自动化、控件树抓取、脚本运行前检查。备选方案是把 ATX 方法加进 `AdbClient`，实现更快但语义混杂，不利于后续维护。

### 3. 启动流程使用状态机模型表达

Bootstrap 状态建议包含：

- `idle`：尚未开始。
- `checking-adb`：检查本机 adb 与设备列表。
- `no-adb`：本机 adb 不可用。
- `no-device`：未发现可用设备或设备状态不是 `device`。
- `checking-atx`：检查目标设备 ATX。
- `installing-atx`：自动安装或初始化 ATX。
- `ready`：设备和 ATX 可用。
- `failed`：发生不可自动恢复错误。

每个状态返回结构化字段：`phase`、`serial`、`message`、`recoverable`、`nextAction`、`errorCode`、`updatedAt`。

理由：启动检查和安装是异步且可能失败的流程，状态机比布尔值更利于 UI 展示、重试和日志排查。备选方案是只返回 `true/false`，但无法区分未打开模拟器、未授权、缺少 ATX、安装失败等场景。

### 4. IPC 只暴露稳定且小的 API 面

新增 IPC 契约建议包括：

- `environment:getBootstrapStatus`：读取最近一次检查结果。
- `environment:runBootstrap`：手动触发检查/安装重试。
- `environment:onBootstrapStatus`：订阅状态变化；如当前 IPC 辅助不支持事件，可先用轮询读取状态，后续再补事件。

preload 应暴露新的 `window.environment` 或同等语义 API，用于查询 bootstrap 状态和触发重试。当前 `window.bot` 上注册的 `tap`、`swipe`、`screenshot` native 方法是测试用途，应在本变更中删除；如果实现阶段仍需要临时调试，应放在开发环境专用模块或内部调试页面，不能作为正式 preload API 暴露。

理由：渲染层需要知道环境是否可用，但不应获得任意 shell/adb 执行能力，也不应保留测试用操作接口。备选方案是保留 `window.bot` 作为通用控制面，虽然开发方便，但会混淆测试入口和正式产品能力，安全边界也过大。

### 5. ATX 安装源和检测策略可配置

ATX 的具体安装方式可能随依赖选择变化，例如 APK 包随应用打包、运行命令初始化、或下载固定版本资源。实现时应抽象成 `AtxInstallStrategy`：

- 默认检测固定包名或服务端口。
- 默认安装使用随应用资源打包的安装文件，避免运行时依赖不稳定网络。
- 安装后必须重新检测，确认结果而不是假设成功。

理由：自动化依赖经常变更，策略接口可以在不影响上层状态机和 UI 的情况下替换安装来源。备选方案是硬编码单一命令，初期简单但后续升级困难。

## Risks / Trade-offs

- [ADB 命令在不同模拟器上输出差异] → 使用结构化解析并保留原始输出；对未知状态返回可诊断错误。
- [用户设备未授权或离线] → 明确区分 `unauthorized`、`offline`、`no-device`，UI 提示用户授权或重启模拟器。
- [自动安装 ATX 可能失败或耗时较长] → 安装流程必须有超时、阶段状态和重试入口，避免应用启动卡死。
- [启动时自动安装可能打扰用户] → 只在发现可用设备但缺少 ATX 时自动执行；若失败则展示可恢复状态，不阻塞主窗口展示。
- [多设备选择策略不完善] → 本阶段选择第一台 `device` 状态设备，并在状态中暴露 serial；后续可增加设备选择 UI。
- [安装资源打包增加应用体积] → 通过策略接口保留后续下载/缓存方案，但首版优先稳定离线安装。
- [第三方 ADB 库 API 变化或能力不足] → 只在 `packages/adb` 内部依赖第三方库，并通过项目自有接口和测试保护调用方；必要时可替换实现或回退 CLI。
- [删除测试 `window.bot` 方法影响当前调试] → 如仍需调试，提供开发环境专用入口，不让测试 API 进入正式 preload contract。

## Migration Plan

1. 在 `packages/adb` 内建立第三方 ADB 库适配层或 CLI fallback，提供命令执行和设备发现能力。
2. 新增自动化环境服务模块，封装 ADB 设备选择、ATX 检测、安装和状态机。
3. 在 Electron main 启动时创建 bootstrap 服务并异步运行，不阻塞窗口创建。
4. 删除测试用 `window.bot` native 方法，并扩展 IPC contract、handlers 和 preload API，提供状态读取和手动重试。
5. 在桌面首页或全局 shell 中展示环境状态，禁用依赖 ADB/ATX 的操作直到状态为 `ready`。
6. 为关键路径添加单元测试或集成测试：设备列表解析、状态机流转、ATX 缺失安装、失败恢复。

回滚策略：保留现有 ADB 操作 IPC；如果 bootstrap 服务异常，可禁用启动自动运行，只保留手动检查入口，不影响基础窗口打开。

## Open Questions

- ATX 的最终安装介质是随桌面应用打包的 APK/二进制资源，还是通过本地命令/网络初始化？实现前需要确认具体 ATX 发行物。
- 第三方 ADB 库的具体选型需要在实现前结合 Electron 打包兼容性、TypeScript 类型、设备流处理、安装能力和维护状态确认。
- 是否需要在首版提供设备选择 UI，还是默认使用第一台可用设备即可？当前设计按默认单设备处理。
- 是否需要记录 bootstrap 日志到本地文件，以便排查用户机器上的安装问题？建议后续接入统一日志模块。

## Implementation Notes

- 本次实现选用 `@devicefarmer/adbkit` 作为底层第三方 ADB 库，并在 `packages/adb` 内部封装为项目自有接口。
- ATX 默认包名暂定为 `com.github.uiautomator`；如后续确认小黄车自动化使用其他包名，需要调整 `DeviceBootstrapService` 的安装策略配置。
- ATX 安装包路径当前通过 `AZURAUTO_ATX_APK_PATH` 环境变量提供；如果未配置或文件不存在，系统会进入可恢复的 `failed` 状态并提示配置安装资源。
- 设备选择策略当前为第一台 `device` 状态设备；后续多设备或用户选择设备能力应复用现有 serial 状态字段扩展。
