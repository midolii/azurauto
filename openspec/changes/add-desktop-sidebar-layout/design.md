## Context

AzurAuto's desktop app is a React/Electron workspace under `apps/desktop` using TanStack Router, shadcn-style UI components, Tailwind CSS, lucide icons, and `motion/react`. The current home route owns the full-screen shell and mixes page chrome with page-specific environment status and preview content.

AzurAuto 桌面端应用位于 `apps/desktop`，基于 React/Electron，使用 TanStack Router、shadcn 风格 UI 组件、Tailwind CSS、lucide 图标以及 `motion/react`。当前首页路由拥有完整的全屏 shell，同时混合了页面框架、环境状态和预览等页面具体内容。

This change introduces a desktop application shell: a persistent left sidebar and a right-side content region. The sidebar provides navigation and task context, while each page renders inside a consistent header/body content structure.

本次变更引入桌面应用 shell：左侧持久 sidebar 和右侧主体内容区域。sidebar 提供导航和任务上下文，每个页面则渲染在统一的 header/body 内容结构中。

## Goals / Non-Goals

**Goals:**

- Add a shadcn sidebar-based layout for desktop navigation.
  - 添加基于 shadcn sidebar 的桌面导航布局。
- Provide Home, Task Execution, and Settings pages/views, with Settings reachable only from the sidebar footer action.
  - 提供首页、任务执行页和设置页/视图，其中 Settings 仅通过 sidebar 底部操作入口进入。
- Keep task execution content intentionally empty for now, using a clear empty state.
  - 任务执行内容当前保持为空，通过明确的空状态展示。
- Reserve space for the application icon as a skeleton placeholder until a real icon is configured.
  - 使用 skeleton 占位预留应用图标位置，等待后续真实图标配置。
- Show task name plus execution status or execution time metadata in the sidebar.
  - 在 sidebar 中显示任务名称，以及执行状态或执行时间元信息。
- Keep Settings reachable from the bottom of the sidebar.
  - 保持 Settings 可从 sidebar 底部进入。
- Use lightweight motion transitions for page switches and respect reduced-motion preferences.
  - 页面切换使用轻量 motion 过渡，并尊重 reduced-motion 偏好。
- Separate page chrome into a reusable page header area and page body area.
  - 将页面框架拆分为可复用的页面头部区域和页面主体区域。
- Preserve route/page state when navigating so pages that later collect logs or runtime output do not reset on each switch.
  - 导航时保留路由/页面状态，避免后续收集日志或运行输出的页面在每次切换时被重置。
- Provide a global client-side state layer for shared settings, task execution metadata, and script run logs.
  - 提供客户端全局状态层，用于共享 settings、任务执行元信息和脚本运行日志。

**Non-Goals:**

- Persisting sidebar collapsed/expanded state across restarts.
  - 不负责在应用重启后持久化 sidebar 折叠/展开状态。
- Implementing actual task execution flows, task history, or task detail data loading.
  - 不实现真实任务执行流程、任务历史或任务详情数据加载。
- Implementing the final application icon asset.
  - 不实现最终应用图标资源。
- Adding backend, IPC, or database changes.
  - 不添加后端、IPC 或数据库变更。

## Decisions

- Use the desktop route tree as the shell boundary.
  - Rationale: The sidebar and content frame should persist while users switch between the initial pages. A shared layout component keeps app chrome out of individual page content.
  - Alternative considered: Keep all state inside the existing home route. This would make Settings and Task Execution harder to add cleanly and would keep page chrome coupled to home content.
  - 决策：使用桌面端路由树作为 shell 边界。
  - 原因：用户在初始页面之间切换时，sidebar 和内容框架应保持稳定。共享 layout 组件可以避免应用框架与单个页面内容耦合。
  - 备选方案：将所有状态都保留在现有首页路由中。这样会让 Settings 和 Task Execution 难以清晰添加，并继续让页面框架和首页内容耦合。

- Use shadcn sidebar primitives and existing shadcn conventions.
  - Rationale: The project already uses shadcn-style components and aliases, so adopting the sidebar pattern keeps styling and composition consistent.
  - Alternative considered: Build a custom fixed aside. This is simpler short term but loses consistency with shadcn interactions, structure, and future extensibility.
  - 决策：使用 shadcn sidebar primitives 和现有 shadcn 约定。
  - 原因：项目已经使用 shadcn 风格组件和路径别名，采用 sidebar 模式可以保持样式和组合方式一致。
  - 备选方案：自定义固定 aside。短期更简单，但会失去与 shadcn 交互、结构和后续扩展能力的一致性。

- Use local navigation state or TanStack routes based on current route structure during implementation.
  - Rationale: If route files for Settings and Task Execution are straightforward to add, they should be real routes. If keeping the proposal small is preferred, a shell-local page state can satisfy initial view switching. In both cases the visible capability remains the same: switching sidebar items changes the main content.
  - Alternative considered: Introduce a larger navigation/data model now. That would be premature before actual task execution data exists.
  - 决策：实现时根据当前路由结构选择使用本地导航状态或 TanStack routes。
  - 原因：如果 Settings 和 Task Execution 路由文件可以直接添加，则应使用真实路由。如果希望保持变更较小，也可以用 shell 内部页面状态满足初始切换需求。两种方式对用户可见能力一致：点击 sidebar 项会切换主体内容。
  - 备选方案：现在引入更大的导航/数据模型。在真实任务执行数据存在之前，这会过早设计。

- Do not rely on unmount/remount page-local React state for data that must survive navigation.
  - Rationale: Task execution pages will later show logs and runtime state; switching away and back must not clear that information. Shared/runtime data should live above the route content in a global store or a persistent shell-level state boundary.
  - Alternative considered: Keep logs and settings in page component state. This is simpler initially but would lose state on route switches and force later rewrites.
  - 决策：需要跨导航保留的数据，不依赖页面组件卸载/重新挂载时的本地 React state。
  - 原因：任务执行页面后续会展示日志和运行态信息；切走再切回时不能清空这些信息。共享/运行态数据应放在路由内容之上的全局 store 或持久 shell 状态边界中。
  - 备选方案：把日志和 settings 保存在页面组件 state 中。初期更简单，但路由切换会丢状态，并导致后续返工。

- Use a lightweight global store abstraction for cross-page desktop state.
  - Rationale: Settings loaded from local files, script logs, task execution status, selected/current task, and timing metadata are shared app concerns. A dedicated store keeps these independent from page lifecycle and easy to read from sidebar and pages. Redux is acceptable, but a smaller store can be used if it fits the existing project better.
  - Alternative considered: Store everything in URL/search params. This is not appropriate for large logs or runtime execution data.
  - 决策：为跨页面桌面状态使用轻量全局 store 抽象。
  - 原因：从本地读取的 settings、脚本日志、任务执行状态、当前任务和时间元信息都是应用级共享状态。专用 store 可以让这些状态独立于页面生命周期，并方便 sidebar 和各页面读取。Redux 可以使用，但如果更小的 store 更适合当前项目，也可以选择其他方案。
  - 备选方案：将所有内容存入 URL/search params。这不适合大量日志或运行态执行数据。

- Represent the app icon as a skeleton placeholder.
  - Rationale: The user explicitly wants to reserve the location for a future icon without deciding the final asset now.
  - Alternative considered: Use a generic lucide icon. This could be mistaken for a final brand mark.
  - 决策：应用图标使用 skeleton placeholder 表示。
  - 原因：用户明确希望先为后续图标预留位置，而不是现在决定最终资源。
  - 备选方案：使用通用 lucide 图标。这可能被误认为最终品牌图标。

- Keep task metadata static or derived from placeholder UI state for the first version.
  - Rationale: The task execution feature is not implemented yet, so sidebar task name/status/time should establish layout and visual affordance without requiring backend data.
  - Alternative considered: Add task execution data plumbing now. This is out of scope and risks designing around unknown execution behavior.
  - 决策：第一版任务元信息保持静态，或从占位 UI 状态派生。
  - 原因：任务执行功能尚未实现，因此 sidebar 中的任务名称/状态/时间应先建立布局和视觉表达，而不依赖后端数据。
  - 备选方案：现在添加任务执行数据链路。这超出范围，也可能围绕未知执行行为过早设计。

- Use `AnimatePresence`, `motion`, and `useReducedMotion` from `motion/react` for transitions.
  - Rationale: `motion` already exists in the desktop package and is currently used in the home route.
  - Alternative considered: CSS-only transitions. CSS would work for simple fades but offers less control for route/view enter-exit sequencing.
  - 决策：使用 `motion/react` 中的 `AnimatePresence`、`motion` 和 `useReducedMotion` 实现过渡。
  - 原因：`motion` 已存在于 desktop package 中，并且当前首页路由已经在使用。
  - 备选方案：仅使用 CSS transitions。CSS 可以实现简单 fade，但对 route/view enter-exit 顺序控制较弱。

## Risks / Trade-offs

- Sidebar primitive may not exist yet → Add the shadcn sidebar component set before building the shell, following existing `components.json` aliases.
  - Sidebar primitive 可能尚不存在 → 在构建 shell 前先按照现有 `components.json` aliases 添加 shadcn sidebar 组件集。
- Moving page chrome out of `routes/index.tsx` may accidentally alter the startup loading flow → Preserve the startup loading behavior and only wrap the ready state in the new shell if necessary.
  - 将页面框架从 `routes/index.tsx` 移出可能意外改变启动加载流程 → 保留启动加载行为，必要时只在 ready 状态下包裹新 shell。
- Placeholder task metadata could look like real execution data → Style it as current/placeholder context and use neutral labels until real task execution is connected.
  - 占位任务元信息可能看起来像真实执行数据 → 将其样式设计为当前/占位上下文，并在真实任务执行接入前使用中性标签。
- Animated page switches can affect accessibility → Respect reduced-motion preferences and keep transition durations short.
  - 页面切换动画可能影响无障碍体验 → 尊重 reduced-motion 偏好，并保持较短动画时长。
- Adding routes may require regenerating TanStack route tree output → Run the existing desktop checks/build so generated route artifacts stay consistent.
  - 添加路由可能需要重新生成 TanStack route tree 输出 → 运行现有 desktop checks/build，确保生成的路由产物保持一致。
- Keeping inactive pages mounted can increase memory use once logs grow → Store durable shared state centrally and only keep mounted UI state when needed for UX.
  - 保持非活跃页面挂载，在日志增长后可能增加内存占用 → 将持久共享状态集中存储，只在 UX 需要时保留已挂载 UI 状态。
- Introducing a store too early can add boilerplate → Start with a small typed store surface for settings, logs, and task execution metadata, and avoid modeling unneeded execution behavior.
  - 过早引入 store 可能增加样板代码 → 从小型 typed store surface 开始，只覆盖 settings、logs 和任务执行元信息，避免建模不需要的执行行为。
