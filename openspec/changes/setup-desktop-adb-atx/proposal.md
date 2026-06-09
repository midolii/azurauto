## Why

桌面端后续需要稳定地执行模拟器自动化、截图分析和游戏操作，但当前只提供基础 ADB 指令调用，缺少应用启动时的环境检查与自动修复能力。这个变更用于在用户打开 `apps/desktop` 应用时主动确认 ADB 设备和 ATX（小黄车自动化）环境可用，降低首次使用和后续自动化功能的失败率。

## What Changes

- 在桌面应用启动流程中增加 ADB 环境检查：识别是否存在可用的模拟器/设备，以及设备是否处于可执行命令状态。
- 增加 ATX 安装状态检查：判断目标 ADB 设备中是否已安装自动化所需组件。
- 当 ATX 缺失时提供自动安装流程，并把安装状态、错误信息和恢复建议暴露给桌面端。
- 将相关逻辑按层拆分：底层 ADB 能力放在 `packages` 并优先通过封装成熟第三方 ADB 库实现，Electron/native 编排逻辑放在 `apps/desktop/electron`，渲染层仅消费状态与触发动作。
- 清理当前 `window.bot` 上用于测试的 native 方法；后续不把测试 tap/swipe/screenshot API 作为稳定产品接口保留。
- 为后续游戏截图自动化、设备会话管理、自动化任务编排预留扩展点。
- 新增中文注释要求，确保关键分层、状态流转和错误处理在实现中易于维护。

## Capabilities

### New Capabilities
- `desktop-adb-atx-bootstrap`: 桌面应用启动时的 ADB 设备发现、ATX 状态检查、缺失安装与状态暴露能力。

### Modified Capabilities

无。

## Impact

- 影响 `apps/desktop/electron/main.ts` 的启动编排流程。
- 影响 `apps/desktop/electron/ipc/*` 与 `apps/desktop/electron/preload/*`，用于移除测试用 `window.bot` native 方法，并提供环境状态查询、安装进度和手动重试能力。
- 影响 `packages/adb`，需要封装第三方 ADB 库或兼容 CLI fallback，提供设备发现、包检测、shell/install 命令、超时和结构化错误能力。
- 可能新增面向自动化领域的 package 或模块，例如设备会话、环境 bootstrap、ATX installer、截图自动化基础接口。
- 需要在桌面端 UI 中展示环境检查/安装状态，避免用户在环境不可用时直接执行自动化操作。
