## ADDED Requirements

### Requirement: 平台能力状态契约
系统 SHALL 提供统一的平台能力状态，用于描述当前运行环境、preload namespace、ADB/bootstrap、截图、scrcpy 预览和视频解码能力是否可用，以及不可用原因和可恢复动作。

#### Scenario: Electron native 能力可用
- **WHEN** 应用运行在 Electron 桌面端且 preload API、ADB/bootstrap、截图和 scrcpy 相关服务可访问
- **THEN** 系统 SHALL 返回对应能力的 `available` 状态，并暴露当前 bootstrap、资源准备、预览运行状态和可执行操作

#### Scenario: Web 环境缺少 native API
- **WHEN** 渲染层运行在没有 Electron preload API 的 Web 环境中
- **THEN** 系统 SHALL 返回 `runtime=web` 或等价环境标识，并把 `environment`、`scrcpy`、`runtime`、`logger`、ADB、截图、scrcpy 和本地资源准备能力标记为 `unavailable` 或 fallback-backed，同时提供用户可读说明

#### Scenario: 视频解码能力不可用
- **WHEN** 当前 WebContents 或浏览器不支持 scrcpy 预览所需的 WebCodecs 或渲染能力
- **THEN** 系统 SHALL 将视频解码或 scrcpy 预览能力标记为 `unavailable` 或 `degraded`，并阻止启动依赖该能力的内嵌预览

### Requirement: 渲染层缺少 native API 时仍可启动
渲染层 SHALL 在 `window.environment`、`window.scrcpy`、`window.runtime`、`window.logger` 或其他 Electron native/preload API 缺失时继续渲染页面，并通过平台能力状态展示降级信息，而不是抛出未捕获运行时错误。

#### Scenario: Web-only 入口加载桌面页面
- **WHEN** 用户在普通浏览器中打开复用桌面渲染层的 Web 页面
- **THEN** 页面 SHALL 正常渲染基础布局、状态区域和 native 不可用提示，不得因为访问缺失的 preload 全局对象而崩溃

#### Scenario: native API 部分缺失
- **WHEN** `window.environment` 可用但 `window.scrcpy` 缺失，或反向出现部分能力缺失
- **THEN** 页面 SHALL 只禁用缺失能力相关的操作，并继续展示其他可用能力的状态

#### Scenario: 资源准备 API 不可用
- **WHEN** Web-only 或 native-missing 环境没有资源准备 API，而启动 UI 需要资源状态才能结束加载
- **THEN** 系统 SHALL 进入终态的 unavailable 或 degraded 资源状态，并渲染主界面与 native 不可用提示，不得无限停留在启动加载状态

### Requirement: native 能力访问边界
系统 SHALL 通过项目自有服务、适配器、IPC 和 preload 契约访问 ADB、截图、scrcpy 和资源准备能力，渲染层不得直接依赖第三方 ADB/scrcpy SDK 类型、raw shell 能力或临时测试 native 方法。

#### Scenario: 新增 native 方法
- **WHEN** 开发者新增点击、滑动、截图、文件推送、日志采集或其他 native 能力
- **THEN** 该能力 SHALL 先在 `packages/adb`、`packages/automation` 或 Electron runtime 服务层形成稳定接口，再通过最小化 IPC/preload API 暴露给渲染层

#### Scenario: 第三方 SDK 被替换
- **WHEN** `adbkit`、`@yume-chan/*` 或其他底层 native/ADB 实现被替换
- **THEN** Electron runtime、preload 和渲染层 SHALL 继续消费项目自有类型和能力状态，不需要直接修改为依赖新 SDK 的类型

#### Scenario: scrcpy 视频协议暴露给渲染层
- **WHEN** native/scrcpy adapter 向渲染层发送视频 metadata、packet 或 event
- **THEN** IPC/preload SHALL 暴露项目自有且可序列化的 renderer-facing 类型，并在 native/scrcpy adapter 边界转换第三方或 Rust-native 协议形状

#### Scenario: 测试 native 方法不进入正式 API
- **WHEN** 实现或调试需要临时 tap、swipe、raw screenshot 或 shell 能力
- **THEN** 系统 SHALL 将其限制在开发/测试专用入口，不得作为正式 preload contract 暴露给产品 UI

### Requirement: ADB、截图和预览操作按能力状态降级
依赖 ADB、uiautomator2 截图或 scrcpy 预览的操作 SHALL 在执行前根据平台能力状态决定可用性，并在不可用时返回结构化错误或展示禁用状态。

#### Scenario: 截图能力不可用
- **WHEN** 用户选择 uiautomator2 截图预览但当前 ADB、bootstrap 或截图源不可用
- **THEN** 系统 SHALL 禁用启动截图预览或停止轮询，并展示不可用原因和可恢复建议

#### Scenario: scrcpy native 能力不可用
- **WHEN** 用户尝试启动 scrcpy 预览但 scrcpy server、native adapter、设备连接或视频解码能力不可用
- **THEN** 系统 SHALL 阻止启动或停止预览，并返回结构化失败状态供 UI 展示

#### Scenario: 能力状态过期后操作失败
- **WHEN** 能力状态显示可用但实际执行截图或预览操作时底层设备断开或 native 调用失败
- **THEN** 系统 SHALL 捕获失败、更新相关能力状态，并向用户展示可恢复的错误信息

### Requirement: Rust 或其他 native 实现可替换
ADB、截图、scrcpy 和资源准备能力 SHALL 以项目自有接口和可序列化数据协议作为边界，使底层实现可切换到 Rust 或其他 native 技术栈，而不要求重写渲染层业务逻辑。

#### Scenario: ADB 实现切换到 Rust
- **WHEN** `packages/adb` 内部从 TypeScript 第三方库实现切换到 Rust-backed 实现
- **THEN** 上层 SHALL 继续通过现有设备列表、shell/screenshot/install/forward/push 等项目自有接口和错误码访问 ADB 能力

#### Scenario: 截图实现切换
- **WHEN** uiautomator2 截图或其他截图来源被替换为 Rust-backed 或其他 native 实现
- **THEN** 渲染层 SHALL 继续接收项目定义的截图帧数据、mime type 和失败状态，而不依赖底层实现细节

#### Scenario: scrcpy 实现切换
- **WHEN** scrcpy 预览底层 adapter 或视频流来源被替换
- **THEN** 渲染层 SHALL 继续通过项目定义的预览状态和视频事件协议消费预览能力，或在协议不支持时进入明确降级状态

### Requirement: 架构健康回归验证
代码库 SHALL 包含能够验证平台能力边界和 native 缺失降级行为的检查或测试，防止后续新增 native 方法重新引入直接依赖或崩溃路径。

#### Scenario: native API 缺失测试
- **WHEN** 测试环境未提供 `window.environment` 和 `window.scrcpy`
- **THEN** 渲染层相关 hooks/components SHALL 返回 native 不可用状态或渲染占位，不得抛出未捕获异常

#### Scenario: 渲染层直接访问审计
- **WHEN** 开发者修改渲染层 native 能力调用代码
- **THEN** 验证流程 SHALL 能发现绕过 platform adapter 的直接 preload 全局对象访问，或在任务验收中明确完成代码搜索审计

#### Scenario: 边界文档验收
- **WHEN** 本变更完成实施
- **THEN** 项目文档 SHALL 说明新增 native 方法、Web-only 降级和未来 Rust 替换时应遵守的包边界、IPC/preload 边界和测试要求
