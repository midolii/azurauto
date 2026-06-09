## Context

AzurAuto 的 desktop renderer 是一个 Electron React 应用，使用 Tailwind CSS v4、TanStack Router、本地 shadcn-style primitives、lucide-react icons、motion transitions 和 sonner toasts。当前 UI 已经具备 sidebar shell、运行时按钮、日志页、调试页、预览区域和设置占位页，但视觉系统在浅色 glass 风格和深色运维面板之间不够统一。

本次重构采用 ui-ux-pro-max 推荐方向的明亮版本：**Light Command Center / Developer Dashboard**。它保留专业工具感、状态优先和 terminal-inspired 日志，但默认使用浅色背景、白色/淡 slate 面板、深色正文、绿色运行状态、琥珀色警告、红色错误、蓝/青色信息强调、清晰的状态 badge 和简洁的操作文案。React 行为和 Electron IPC 边界保持不变。

## Goals / Non-Goals

**Goals:**

- 为 desktop React renderer 建立统一的默认明亮命令中心设计系统。
- 让 runtime state、resource readiness、task status、logs 和 preview controls 更容易扫描和理解。
- 将页面表面统一为 command panels、metric/status cards 和可读性更好的 terminal-style log areas。
- 保留现有 route 结构、store 形状、IPC 调用、runtime actions、preview hooks 和 logging behavior。
- 改善 keyboard/focus affordances、disabled states、loading states 和 error visibility。

**Non-Goals:**

- 不修改 Electron main/preload IPC contracts 或 automation package 行为。
- 不新增真实脚本选择、配置持久化或后端能力。
- 不引入 cyberpunk、重 neon、强装饰性的 UI 风格。
- 不替换现有 routing/store 架构。

## Decisions

### 使用 light command-center theme 替代当前不统一的 mixed theme

应用应默认呈现明亮但专业的操作型主题，例如 `#F8FAFC`、`#EFF6FF`、`#FFFFFF` 面板、`#CBD5E1` 边框、`#0F172A` 正文和蓝/青/绿状态强调。该方向比纯 dark UI 更轻、更适合长时间配置和调试，同时仍保留脚本自动化控制台的密度与秩序。

备选方案：使用 Dark Command Center。该方案虽然适合日志密集工具，但当前产品需要默认更轻的明亮体验，因此改为 Light Command Center；日志和预览区域可以保留局部深色/terminal surface。

### 保持效果克制，并以状态优先

使用轻量 border、shadow、gradient 和 150-300ms transition。避免 glitch effects、heavy glow、scanlines 或 cyberpunk 风格，即使这些风格也常见于 developer tools，因为它们会降低长时间使用时的可读性。

备选方案：完整 cyberpunk/HUD UI。该方案因为可访问性、视觉疲劳和专业感不足被拒绝。

### 统一 runtime 和 resource state 的呈现

Runtime state、task status、ADB resource readiness、stream status、FPS、duration 和 log levels 应共享一套 card/badge 语义。现有来自 `desktop-store`、`StartupResourceStatus`、`ScriptRuntimeStatus` 和 log entries 的值应映射为一致的视觉 variants：idle、running、paused、success、warning、error、disabled 和 info。

备选方案：继续保留每个页面自己的 badge classes。该方案会造成语义不一致，也会让未来扩展脚本页面更困难。

### 保留实现边界

重构应集中在 renderer UI 文件和启动 loading 模板：global CSS tokens、app shell、sidebar、page frame、route pages、presentational status/preview components、React startup loading screen 和 Electron startup splash HTML。IPC、preload APIs、runtime handlers 和 automation packages 保持不变，除非 UI 重构暴露了必须修复的类型问题。

备选方案：将 UI 重构与 runtime 或配置功能一起实现。该方案会扩大风险，因此本 change 只处理 UI/UX 重构。

### 优先使用现有 primitives，避免新增依赖

使用当前 Button、Sidebar、form primitives、lucide icons、motion 和 Tailwind utilities。如果实现命令面板，优先使用项目里已有的 Radix/shadcn 模式，再考虑新增依赖。

备选方案：引入完整 UI kit 或 design-system package。该方案被拒绝，因为当前项目已经有足够的基础组件，不需要额外运行时依赖。

## Risks / Trade-offs

- [Risk] light-first UI 可能削弱日志和运行状态的技术感 → Mitigation: 使用局部 terminal panels、monospace labels 和清晰 status colors 保留工具属性。
- [Risk] 命令中心布局容易变得信息过密 → Mitigation: 使用明确 section hierarchy、spacing、grouped status cards 和简洁 label。
- [Risk] 样式重构可能误改 button disabled behavior 或 runtime controls → Mitigation: 保持 event handlers 和 state logic 不变，将行为和表现分离处理。
- [Risk] preview panels 的 live canvas/image 容器变化可能影响画面显示 → Mitigation: 保留现有 refs、image/canvas host structure、min-height constraints 和 overflow handling。
- [Risk] 日志列表较多时可能出现性能问题 → Mitigation: 保留现有 500-entry cap，避免为每条日志增加昂贵动画。

## Migration Plan

1. 更新 global CSS tokens、fonts、background、focus rings 和 shared utility classes 到默认明亮的 command-center 设计系统。
2. 重构 app shell 和 sidebar，建立新的 desktop frame、status rail、navigation 和 runtime control 呈现方式。
3. 重构 page frame 和 route pages，统一使用 command panels 和 status sections。
4. 重构 debug、preview、environment status、settings、logs、React startup loading 和 Electron startup splash，同时保留 handlers 与 data flow。
5. 运行 desktop checks，并手动检查常见状态：Electron splash、React resource loading、idle、resource loading、recoverable error、runtime starting/running/paused、empty logs、populated logs、preview disabled、preview streaming。

Rollback 很简单：回滚本 OpenSpec change 中的 renderer UI 改动即可。无需持久化数据迁移。

## Open Questions

- `Cmd/Ctrl+K` 命令面板是否应包含在第一阶段实现中，还是等脚本选择和设置能力更完整后再做？
- 后续是否需要提供 light/dark theme toggle，或长期维持默认 light？
