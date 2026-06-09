## Why

The desktop experience needs a persistent navigation structure so users can move between the home view, task execution, and settings without losing application context. Establishing a shadcn sidebar layout now creates the foundation for future task metadata, execution status, and application icon configuration.

桌面端需要一个持久化的导航结构，让用户在首页、任务执行页和设置页之间切换时不会丢失应用上下文。现在引入 shadcn sidebar 布局，可以为后续任务元信息、执行状态以及应用图标配置打好基础。

## What Changes

- Add a desktop sidebar using shadcn sidebar patterns/components.
  - 使用 shadcn sidebar 模式/组件添加桌面端侧边栏。
- Add sidebar navigation entries for Home and Task Execution; Settings is only shown as the bottom sidebar action.
  - 在侧边栏中添加首页和任务执行导航入口；Settings 只显示为侧边栏底部操作按钮。
- Display a reserved application icon skeleton at the top of the sidebar for future icon configuration.
  - 在侧边栏顶部预留应用图标 skeleton，占位给后续图标配置使用。
- Show task-related summary information near the top of the sidebar, including task name and execution status or elapsed/execution time.
  - 在侧边栏顶部附近显示任务相关摘要信息，包括任务名称、执行状态或已执行/执行时间。
- Add a Settings button at the bottom of the sidebar that switches the main view to the Settings page.
  - 在侧边栏底部添加 Settings 按钮，点击后切换主体区域到设置页。
- Add an empty-state Task Execution page.
  - 添加任务执行页面的空状态。
- Structure the main content area with an upper page header section for title and optional description, and a lower page body section for page-specific content.
  - 将右侧主体内容区域拆分为上下两部分：上方页面头部显示标题和可选描述，下方页面主体显示具体页面内容。
- Add simple motion-based transitions when switching pages.
  - 页面切换时添加基于 motion 的简单过渡动画。
- Preserve page state when switching routes/pages so future page-local data such as logs is not lost by navigation.
  - 切换路由/页面时保留页面状态，避免后续页面内的日志等数据因为导航而丢失。
- Add or prepare a global store for shared desktop state such as locally loaded settings, script run logs, and task execution metadata.
  - 添加或预留全局 store，用于存储桌面端共享状态，例如从本地读取的 settings 配置、脚本运行日志和任务执行元信息。

## Capabilities

### New Capabilities
- `desktop-sidebar-layout`: Provides desktop app navigation, sidebar task context, page switching, page header/body structure, animated page transitions, and preserved/shared state across navigation.
  - `desktop-sidebar-layout`：提供桌面端应用导航、侧边栏任务上下文、页面切换、页面头部/主体结构、页面切换动画，以及跨导航的状态保留/共享状态能力。

### Modified Capabilities

## Impact

- Affected UI code for the desktop shell/layout and page content areas.
  - 影响桌面端 shell/layout 以及页面内容区域相关 UI 代码。
- May add or use shadcn sidebar components, motion animation utilities, and a client-side state store if not already present.
  - 如果当前尚未存在，可能需要添加或使用 shadcn sidebar 组件、motion 动画工具以及客户端状态 store。
- No backend API or data model changes are expected for this proposal.
  - 本提案预计不涉及后端 API 或数据模型变更。
