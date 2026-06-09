## ADDED Requirements

### Requirement: 启动时检查 ADB 设备
桌面应用 SHALL 在 Electron 应用启动后自动检查本机 ADB 是否可执行，并识别至少一台处于 `device` 状态的模拟器或 Android 设备。

#### Scenario: 发现可用设备
- **WHEN** 用户打开桌面应用且 `adb devices` 返回至少一台状态为 `device` 的设备
- **THEN** 系统 SHALL 记录目标设备 serial 并继续执行 ATX 检查

#### Scenario: 未发现可用设备
- **WHEN** 用户打开桌面应用但 ADB 未返回任何状态为 `device` 的设备
- **THEN** 系统 SHALL 暴露 `no-device` 状态，并提供打开模拟器或检查 USB/授权状态的恢复提示

#### Scenario: ADB 不可用
- **WHEN** 用户打开桌面应用但本机无法执行 `adb`
- **THEN** 系统 SHALL 暴露 `no-adb` 状态，并提供安装或配置 ADB 环境变量的恢复提示

### Requirement: 检查目标设备中的 ATX 状态
系统 SHALL 在发现目标 ADB 设备后检查该设备是否已安装并可使用 ATX（小黄车自动化）能力。

#### Scenario: ATX 已安装
- **WHEN** 目标设备可用且 ATX 检测通过
- **THEN** 系统 SHALL 将 bootstrap 状态更新为 `ready`，并允许后续 ADB/自动化操作执行

#### Scenario: ATX 未安装
- **WHEN** 目标设备可用但 ATX 检测未通过
- **THEN** 系统 SHALL 进入 `installing-atx` 状态并启动自动安装流程

### Requirement: 自动安装缺失的 ATX
系统 SHALL 在目标设备缺少 ATX 时自动执行安装或初始化，并在安装完成后重新检测 ATX 状态。

#### Scenario: 自动安装成功
- **WHEN** 系统完成 ATX 安装且重新检测通过
- **THEN** 系统 SHALL 将 bootstrap 状态更新为 `ready`，并记录目标设备 serial 与更新时间

#### Scenario: 自动安装失败
- **WHEN** 系统执行 ATX 安装失败、超时或安装后检测仍未通过
- **THEN** 系统 SHALL 暴露 `failed` 状态、结构化错误码、可读错误信息和手动重试入口

### Requirement: 暴露环境状态给渲染层
系统 SHALL 通过类型安全的 Electron IPC/preload API 向渲染层暴露 ADB/ATX bootstrap 状态和手动重试能力。

#### Scenario: 渲染层读取状态
- **WHEN** 渲染层请求当前 bootstrap 状态
- **THEN** 系统 SHALL 返回包含阶段、目标设备 serial、用户提示、是否可恢复、错误码和更新时间的结构化结果

#### Scenario: 用户手动重试
- **WHEN** 用户在渲染层触发环境检查重试
- **THEN** 系统 SHALL 重新执行 ADB/ATX bootstrap 流程，并更新可读取状态

### Requirement: 移除测试用途的 bot native 方法
系统 SHALL 移除当前 `window.bot` 上用于测试的 tap、swipe 和 screenshot native 方法，不得把这些测试接口作为正式 preload API 继续暴露。

#### Scenario: 正式渲染环境不暴露测试 bot API
- **WHEN** 渲染层在正式应用环境中加载 preload API
- **THEN** 系统 SHALL 只暴露环境 bootstrap 或后续正式自动化能力所需的稳定 API，而不是测试用途的 `window.bot.tap`、`window.bot.swipe` 和 `window.bot.screenshot`

#### Scenario: 开发者需要临时调试 ADB 操作
- **WHEN** 实现阶段需要保留 ADB 操作调试能力
- **THEN** 系统 SHALL 将调试入口限制在开发环境专用模块或内部调试页面中，并避免进入正式 preload contract

### Requirement: 分层实现环境 bootstrap
实现 SHALL 将底层 ADB 命令、ATX 检测安装、Electron native 编排、IPC/preload 暴露和渲染层展示拆分到独立层级，避免把业务流程集中在单一 UI 或 main 文件中。

#### Scenario: 后续自动化功能复用设备能力
- **WHEN** 后续实现游戏截图自动化、设备会话或脚本执行功能
- **THEN** 新功能 SHALL 能复用 ADB 设备发现、设备 serial、截图命令和 bootstrap ready 状态，而不需要重新实现启动检查逻辑

#### Scenario: 维护者阅读关键流程
- **WHEN** 维护者查看设备 bootstrap、ATX 安装或状态机相关代码
- **THEN** 关键模块 SHALL 包含中文注释说明分层职责、状态流转和错误恢复策略

#### Scenario: 底层 ADB 实现使用第三方库
- **WHEN** 底层 ADB 能力由第三方库实现
- **THEN** 系统 SHALL 在 `packages/adb` 内封装第三方库，并向 Electron native 和自动化层提供项目自有的稳定接口
