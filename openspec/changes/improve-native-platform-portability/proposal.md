## Why

当前代码已经把 Electron、ADB 和自动化能力做了初步分层，但 ADB、截图、scrcpy/WebCodecs 等能力仍然缺少明确的“平台能力契约”和降级策略。后续新增 native 方法、把底层实现切换到 Rust，或单独打开 Web 端查看当前状态时，必须避免渲染层因为缺少 native API 而直接报错或被底层实现细节锁死。

## What Changes

- 明确当前结构的健康边界：`renderer -> preload -> IPC -> automation -> adb/scrcpy`，并把它固化为后续开发必须遵守的架构约束。
- 新增平台能力契约，用统一状态描述 ADB、截图、scrcpy 预览、WebCodecs、ATX/bootstrap 等能力是否可用、不可用原因和可恢复动作。
- 为 Web-only 或 native 不可用场景定义降级行为：页面仍可启动并展示状态/说明，依赖 native 的操作被禁用或显示占位，而不是因缺少 `window.environment`、`window.scrcpy`、`window.runtime`、`window.logger` 等 preload 对象报错。
- 为后续新增 native 方法定义扩展路径：先在服务/适配层设计稳定接口，再通过最小化 preload API 暴露，禁止把临时测试方法或第三方 SDK 类型直接泄漏到渲染层。
- 为未来 Rust 替换或其他技术栈替换提供迁移边界：优先替换 `packages/adb`、scrcpy 适配和资源准备实现，上层自动化状态机与 UI 继续消费项目自有接口。
- 补充架构健康检查、类型守卫和测试任务，验证缺少 native 能力时桌面渲染层和未来 Web 端入口不会崩溃。

## Capabilities

### New Capabilities
- `native-platform-portability`: 平台能力发现、native 不可用降级、ADB/截图/scrcpy 适配边界，以及未来 Rust/Web 技术栈替换的约束与验收标准。

### Modified Capabilities

无。

## Impact

- 影响 `apps/desktop/src` 中消费 native/preload API 的页面、hooks 和类型声明，需要支持 `environment`、`scrcpy`、`runtime`、`logger` 等 preload namespace 缺失或能力不可用状态。
- 影响 `apps/desktop/electron/preload/*`、`apps/desktop/electron/ipc/*` 和 `apps/desktop/electron/runtime/*` 的 API 边界说明，后续新增 native 能力必须通过稳定契约暴露。
- 影响 `packages/adb` 和 `packages/automation` 的接口约束与测试策略，需要继续避免第三方 ADB/scrcpy SDK 类型泄漏到上层。
- 可能新增面向平台能力的共享类型、runtime guard 或 adapter 模块，用于统一桌面端、Web-only 入口和未来 Rust-backed native 实现的行为。
- 影响文档与开发规范，后续实现 ADB、截图、scrcpy、资源准备或 Rust 替换时需要按本变更定义的边界验收。
