## Context

AzurAuto 当前是 Electron + TanStack Start 桌面端 monorepo，核心分层已经比较健康：渲染层位于 `apps/desktop/src`，Electron native/IPC/preload 位于 `apps/desktop/electron`，ADB 和 scrcpy 底层实现位于 `packages/adb`，设备 bootstrap 与 uiautomator2 截图位于 `packages/automation`。现有文档也已经明确移除测试用途的 `window.bot`，正式 preload namespace 收敛到 `window.environment`、`window.scrcpy`、`window.runtime` 与 `window.logger` 等项目自有 API。

主要风险不是“所有代码都混在一起”，而是渲染层仍默认这些 Electron preload 全局对象一定存在，例如 `useEnvironmentBootstrap`、`useUiautomator2Preview`、`useScrcpyPreview` 会直接访问 `window.environment` 和 `window.scrcpy`，部分页面也会直接访问 `window.runtime` 或 `window.logger`。如果后续打开纯 Web 入口、执行浏览器测试、切换 native 实现、或某些能力因为平台不支持而缺失，页面可能在能力状态展示之前就抛错。

另一个风险是底层实现替换边界需要继续保持清晰。`packages/adb` 已经封装 `adbkit` 和 `@yume-chan/*`，`packages/automation` 只依赖项目自有 ADB 接口，这是后续 Rust 替换的良好基础；但 scrcpy、截图和资源准备仍需要明确能力状态、错误模型和替换验收标准，避免未来新增 native 方法时绕过服务层直接暴露给 UI。

## Goals / Non-Goals

**Goals:**

- 定义平台能力模型，让渲染层能判断 ADB、bootstrap、截图、scrcpy、WebCodecs 和资源准备是否可用、不可用原因、以及是否可恢复。
- 让桌面渲染层和未来 Web-only 入口在没有 Electron preload/native API 时仍可启动，并展示 `native-unavailable` 或同等降级状态。
- 规定新增 native 方法的扩展路径：先在 `packages/adb`、`packages/automation` 或 Electron runtime 服务层设计稳定接口，再通过最小 preload API 暴露。
- 保持底层实现可替换：未来把 ADB、截图、scrcpy 或资源准备切换到 Rust 时，上层继续依赖项目自有类型和数据协议。
- 增加架构健康检查与回归测试，覆盖缺少 native API、WebCodecs 不支持、ADB 不可用和截图/预览能力不可用场景。

**Non-Goals:**

- 不在本变更中真正实现 Rust ADB/scrcpy 后端，只定义迁移边界和验收标准。
- 不实现完整 Web 远程控制台或云端设备管理；本阶段只保证 Web 入口可安全展示状态/占位，不被本地 native API 缺失阻塞。
- 不重写现有 ADB bootstrap、ATX 安装或 uiautomator2 截图状态机，只补齐能力契约和降级行为。
- 不恢复 `window.bot` 这类测试 native API，也不把 raw shell/ADB 任意执行能力暴露给渲染层。

## Decisions

### 1. 渲染层通过平台适配器访问 native 能力，而不是直接假设 preload 全局对象存在

在渲染层新增一个薄的 platform adapter，例如 `apps/desktop/src/platform` 或同等模块，集中读取 `window.environment`、`window.scrcpy`、`window.runtime`、`window.logger`、WebCodecs 支持情况和浏览器环境。页面、hooks 和组件只消费该适配器返回的能力对象与操作函数。

适配器在 Electron 环境中代理真实 preload API；在 Web-only 或 native 缺失环境中返回稳定的 unavailable 实现：状态读取返回结构化 `unavailable` 结果，操作函数返回可展示错误或 no-op 结果，而不是抛出 `Cannot read properties of undefined`。

理由：这是最小改动点，可以先保护现有 UI，又不会把 Electron 细节扩散到更多页面。备选方案是在每个 hook 内手写 `if (!window.environment)`，短期快但会让降级逻辑分散，未来新增 native 能力时容易漏掉。

### 2. 平台能力状态使用数据契约表达，而不是靠异常控制 UI

定义统一的能力状态结构，至少覆盖：

- `runtime`: `electron`、`web`、`unknown`。
- `environment`: bootstrap/resource/captureScreenshot 是否可用。
- `preload`: `environment`、`scrcpy`、`runtime`、`logger` 等 namespace 是否存在。
- `adb`: ADB 是否可访问、当前设备状态、不可用原因。
- `screenshot`: uiautomator2 截图是否可用。
- `scrcpy`: native scrcpy pipeline 是否可用、是否运行中。
- `videoDecoder`: WebCodecs/WebGL/bitmap renderer 支持情况。

每个能力返回 `available | unavailable | degraded`、用户可读说明、可恢复动作和底层错误码。依赖能力的 UI 按状态禁用按钮、显示占位或引导用户修复；真正执行操作时仍保留 try/catch，但异常只作为兜底。

理由：状态模型能同时服务桌面端、Web 端和测试，也便于后续上报诊断信息。备选方案是继续调用操作并捕获异常，但 UI 无法在用户点击前准确知道按钮是否应该可用。

### 3. 新增 native 方法必须先进入服务/适配层，再进入 preload

后续如新增截图、点击、滑动、日志、文件推送或 Rust-backed 方法，必须遵守：

1. 底层 ADB/scrcpy/系统能力放在 `packages/adb` 或独立 native adapter 内。
2. 自动化领域流程放在 `packages/automation` 或 Electron runtime 服务中。
3. IPC/preload 只暴露任务级、状态级、数据级方法，不暴露 raw shell、第三方 SDK 对象或测试临时方法。
4. 渲染层通过 platform adapter 消费这些能力，并有 unavailable/degraded fallback。

理由：项目现有分层已经证明可行，继续扩大这个边界可以保护 Rust/Web 迁移。备选方案是为了速度直接把方法挂到 `window`，但会让 API 一旦被 UI 依赖就很难替换。

### 4. Rust 替换优先发生在包边界，而不是 UI 或 IPC 协议边界

未来如果改用 Rust 实现 ADB、截图或 scrcpy，优先替换 `packages/adb` 内部实现、scrcpy adapter、资源准备命令或 Electron main 侧 bridge。上层仍使用项目自有类型，例如设备列表、bootstrap 状态、截图 `Uint8Array`、scrcpy preview status 和视频事件。

IPC/preload 的数据协议应保持纯数据：字符串、数字、布尔值、枚举、普通对象、`Uint8Array` 或可序列化二进制，不把 Rust FFI handle、Node stream、第三方 class 实例传给 UI。scrcpy 视频 metadata、packet 和 event 也应转换为项目自有的 renderer-facing 类型，避免渲染层直接依赖 `@yume-chan/*` 的协议形状。

理由：这样 Rust 替换是实现细节，不会要求重写 UI。备选方案是让 UI 直接理解 Rust/native 插件返回的对象，短期减少一层转换，但会牺牲可测试性和 Web fallback。

### 5. Web 入口默认是“状态/占位可见”，不是“本地设备能力可用”

如果后续开 Web 端，默认能力模型应返回 `runtime=web` 且本地 ADB/scrcpy/截图能力不可用。页面应能正常渲染导航、配置、状态说明、历史信息或占位区域；依赖本机 native 的按钮禁用，并提示需要桌面端或未来远程设备服务。

理由：这符合用户“能正常查看当前信息，不会被没有 native 方法报错拦住”的目标。备选方案是让 Web 端只复用部分页面，避开 native 页面，但会造成 UI 分叉和长期维护成本。

## Risks / Trade-offs

- [适配器只包住部分调用，仍有直接 `window.environment`/`window.scrcpy`/`window.runtime`/`window.logger` 访问残留] → 使用代码搜索、单元测试和后续 lint 约束验证渲染层访问都经过 platform adapter。
- [抽象过度导致开发新 native 方法变慢] → 能力模型保持最小字段集，只覆盖状态、可用性、错误和操作入口，不引入复杂插件系统。
- [Web 端“当前信息”的来源不明确] → 首版只保证 UI 可启动和展示本地不可用状态；需要真实设备状态时再设计远程 API 或持久化状态同步。
- [WebCodecs 或 renderer 支持差异导致 scrcpy 预览不可用] → 把解码器能力纳入 `videoDecoder` 状态，UI 在启动预览前展示不可用原因或建议切换截图模式。
- [Rust 后端错误模型和现有 TypeScript 错误模型不一致] → 在 native adapter 边界统一映射为项目自有错误码和状态，不让 Rust/第三方错误对象穿透到 UI。
- [能力状态可能与实际操作瞬时状态不一致] → 操作方法仍返回结构化成功/失败结果，并在失败后刷新能力状态。

## Migration Plan

1. 审计 `apps/desktop/src` 中所有 `window.environment`、`window.scrcpy`、`window.runtime`、`window.logger` 和浏览器能力直接访问点，列出需要迁移的 hooks/components。
2. 新增平台能力类型与 platform adapter，在 Electron 中代理真实 preload API，在 Web/native 缺失环境中返回 unavailable fallback。
3. 迁移 `useEnvironmentBootstrap`、`useUiautomator2Preview`、`useScrcpyPreview` 等调用点，保证缺少 native API 时只更新降级状态，不抛运行时错误。
4. 更新 UI 文案和按钮状态，明确 ADB、截图、scrcpy、WebCodecs 不可用时的恢复建议或 Web-only 占位。
5. 为 native 缺失、WebCodecs 缺失、截图失败、scrcpy 不可用和正常 Electron 能力路径增加测试。
6. 补充 README/架构说明，把新增 native 方法和 Rust 替换的边界写入开发规范。

回滚策略：platform adapter 可以先保留与现有 preload API 同名的方法；若迁移出现问题，可逐个 hook 回退到真实 Electron API，同时保留 unavailable fallback 测试作为后续修复依据。

## Open Questions

- Web 端未来要展示的“当前信息”来自本地缓存、桌面端同步、还是后端/远程设备服务？这会影响后续是否需要新增 server API。
- 平台能力类型应放在 `apps/desktop/src/platform`，还是抽成 workspace package 以便未来 Web app 复用？首版建议先放桌面端内部，稳定后再抽包。
- scrcpy 在 Web 端是否需要远程流媒体替代方案，还是只展示不支持状态？本变更按不支持处理。
