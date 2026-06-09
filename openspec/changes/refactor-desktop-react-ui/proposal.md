## Why

桌面端 React UI 目前混合了偏柔和的 coastal/glass 视觉语言和偏深色的调试面板，整体不像一个以状态和效率为核心的 Electron 脚本控制台。根据 ui-ux-pro-max 的建议，将现有界面重构为默认明亮的 **Light Command Center / Developer Dashboard** 风格，可以提升日志、运行状态、ADB 状态、预览控制和启动 loading 的可读性，并让界面更贴合脚本自动化工具的使用场景。

## What Changes

- 将当前偏装饰且不统一的主题替换为专业的明亮命令中心设计系统，并将默认模式设为 light。
- 重构 app shell、sidebar、page frame、首页、调试页、日志页和设置页，让界面围绕运行状态、关键操作和密集但清晰的信息展示组织。
- 同步重构 Electron 启动 splash loading 和 React 资源准备 loading 页面，使启动链路视觉一致。
- 统一状态 badge、卡片、日志行、面板、字体、间距、focus 状态和 hover 状态。
- 保留现有运行时行为、ADB/scrcpy/uiautomator 流程、IPC contract、路由和 store 语义。
- 改善 loading、disabled、error、warning、success、running 等状态的可访问性和 UX 反馈。

## Capabilities

### New Capabilities

- `desktop-command-center-ui`: 定义 desktop React renderer 的明亮命令中心视觉系统、布局行为、状态呈现、启动 loading 和脚本自动化工作流中的交互反馈。

### Modified Capabilities

- None.

## Impact

- 影响代码：`apps/desktop/src/styles.css`、`apps/desktop/src/components/app-shell/*`、`apps/desktop/src/routes/~pages/*`、`apps/desktop/src/components/home/*`，以及 `apps/desktop/electron/template/startup-splash.html`。
- UI 技术栈：React 19、TanStack Router、Tailwind CSS v4、shadcn-style components、lucide-react icons、motion、sonner。
- 预计不需要修改 Electron main/preload IPC contract。
- 预计不需要新增 package 依赖；除非实现阶段决定加入命令面板，并且当前本地 UI primitives 无法满足需求。
