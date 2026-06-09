## Context

The desktop app currently has a startup/environment bootstrap flow that can lead into ADB-oriented readiness checks, while the current Home page contains the automation environment check and device preview UI. Recent sidebar work added persistent navigation, task context, page transitions, and shared desktop state.

当前桌面端应用已有启动/环境 bootstrap 流程，可能进入 ADB 相关 readiness 检查；同时当前 Home 页面承载了自动化环境检查与设备预览 UI。近期 sidebar 变更已添加持久导航、任务上下文、页面切换动画和共享桌面状态。

This change separates three concerns: app resource preparation at startup, explicit script runtime start/pause controls, and page structure for Home vs Debug. Startup should prepare local resource files only; ADB connection and uiautomator screenshot capture should begin only when the user starts the script from the sidebar.

本次变更拆分三个关注点：应用启动时的资源准备、显式脚本运行开始/暂停控制，以及 Home 与 Debug 页面结构。启动阶段只准备本地资源文件；ADB 连接和 uiautomator 截图采集仅在用户从 sidebar 点击开始脚本时启动。

## Goals / Non-Goals

**Goals:**

- Add icon-only Start and Pause controls in the sidebar top area.
  - 在 sidebar 顶部添加仅图标的开始与暂停控制。
- Track script runtime state in shared desktop state so sidebar and pages can react consistently.
  - 在共享桌面状态中追踪脚本运行态，确保 sidebar 和页面表现一致。
- Add a new welcome Home page that hides the usual title/description card.
  - 新增欢迎首页，并隐藏常规 title/description 卡片。
- Move the existing environment check and preview experience into a Debug page.
  - 将现有环境检查与预览体验迁移到 Debug 页面。
- Limit app startup loading to local resource validation/download for resources that are later pushed to ADB devices, including uiautomator2 and scrcpy-server.
  - 将应用启动 loading 限制为本地资源校验/下载，目标资源包括后续会 push 到 ADB 设备的 uiautomator2 和 scrcpy-server。
- Avoid automatic ADB connection on app open.
  - 避免应用打开时自动连接 ADB。
- Start ADB connection and uiautomator screenshot capture only after the sidebar Start control is clicked.
  - 仅在点击 sidebar 开始按钮后连接 ADB 并启动 uiautomator 截图采集。
- Keep scrcpy video stream manual; do not start it as part of script start.
  - 保持 scrcpy 视频流为手动启动，不作为脚本开始的一部分自动启动。

**Non-Goals:**

- Implementing complete script execution, OCR processing, or script scheduling.
  - 不实现完整脚本执行、OCR 处理或脚本调度。
- Automatically starting scrcpy video streaming.
  - 不自动启动 scrcpy 视频流。
- Persisting runtime state across app restarts.
  - 不负责跨应用重启持久化运行态。
- Adding new database storage.
  - 不添加新的数据库存储。

## Decisions

- Reorder implementation around dependency flow: resource preparation first, page/navigation split second, runtime controls last.
  - Rationale: script start depends on resources being present and on navigation/state being ready to expose the runtime. This ordering reduces coupling and avoids introducing controls that call unavailable services.
  - Alternative considered: add UI buttons first and wire services later. This would produce controls with unclear or temporary behavior.
  - 决策：按依赖顺序实现：先资源准备，再页面/导航拆分，最后脚本运行控制。
  - 原因：脚本开始依赖资源存在，也依赖导航与状态已准备好承载运行态。该顺序能降低耦合，避免按钮先出现但服务不可用。
  - 备选：先加 UI 按钮再接服务。这会产生行为不明确或临时的控制入口。

- Split startup resource preparation from ADB/device bootstrap.
  - Rationale: opening the app should be lightweight and should not require a connected device. Resource preparation can run independently by checking/downloading local files such as uiautomator2 and scrcpy-server.
  - Alternative considered: keep current bootstrap as-is and hide UI until ADB is ready. This conflicts with the requirement that app startup must not connect to ADB.
  - 决策：将启动资源准备与 ADB/device bootstrap 拆分。
  - 原因：打开应用应保持轻量，不应要求设备已连接。资源准备可独立检查/下载本地文件，例如 uiautomator2 和 scrcpy-server。
  - 备选：保持现有 bootstrap，直到 ADB ready 才显示 UI。这与应用启动不自动连接 ADB 的要求冲突。

- Introduce explicit runtime actions in the desktop store and sidebar.
  - Rationale: Start/Pause state is shared UI state: the sidebar needs to show controls, Debug may show status, and future script pages may read the same runtime state.
  - Alternative considered: keep runtime state local to the sidebar. That would make future pages unable to react without prop drilling or rewrites.
  - 决策：在 desktop store 和 sidebar 中引入显式运行态动作。
  - 原因：开始/暂停是共享 UI 状态：sidebar 需要显示控制，Debug 可能显示状态，后续脚本页面也需要读取相同运行态。
  - 备选：将运行态保留在 sidebar 局部。未来页面需要响应时会导致 prop drilling 或返工。

- Treat uiautomator screenshot capture as the script runtime visual/recognition feed, separate from scrcpy.
  - Rationale: OCR logic needs screenshots, not necessarily a live video stream. Starting uiautomator capture on script start supports automation while avoiding scrcpy cost and complexity.
  - Alternative considered: start scrcpy for all script runs. This consumes more resources and violates the requirement not to actively enable scrcpy.
  - 决策：将 uiautomator 截图采集作为脚本运行的视觉/识别输入，并与 scrcpy 分离。
  - 原因：OCR 逻辑需要截图，不一定需要实时视频流。脚本开始时启动 uiautomator 截图能支持自动化，同时避免 scrcpy 的开销和复杂度。
  - 备选：所有脚本运行都启动 scrcpy。这会消耗更多资源，并违反不主动开启 scrcpy 的要求。

- Allow PageFrame header/card visibility to be controlled per page.
  - Rationale: the welcome Home page should be visually lighter and not show the standard title/description card, while Debug and Settings can keep structured headers.
  - Alternative considered: build Home outside the shared shell. That would reduce layout consistency and duplicate shell behavior.
  - 决策：允许按页面控制 PageFrame header/card 是否显示。
  - 原因：首页欢迎内容应更轻，不显示标准 title/description 卡片；Debug 和 Settings 仍可保留结构化 header。
  - 备选：让 Home 脱离共享 shell。这样会降低布局一致性并重复 shell 行为。

## Risks / Trade-offs

- Resource preparation and ADB bootstrap may currently be coupled → Introduce a narrow resource-preparation API before changing start behavior.
  - 资源准备与 ADB bootstrap 当前可能耦合 → 在修改开始行为前，先引入窄范围资源准备 API。
- Start button can be clicked while resources are missing → Disable or show busy state until resource preparation is complete.
  - 资源缺失时可能点击开始按钮 → 在资源准备完成前禁用按钮或显示 busy 状态。
- Uiautomator screenshot loop can leak work after pause → Ensure pause/stop cancels screenshot capture and clears runtime busy state.
  - uiautomator 截图循环可能在暂停后泄漏 → 确保 pause/stop 会取消截图采集并清除运行 busy 状态。
- Moving the debug content can break existing preview behavior → Reuse existing environment status and preview components as much as possible.
  - 迁移 Debug 内容可能破坏现有预览行为 → 尽量复用现有环境状态和预览组件。
- Existing OpenSpec change for sidebar layout may still be active → Implement against current working tree and keep changes scoped to this refinement.
  - sidebar layout 的 OpenSpec 变更可能仍处于 active → 基于当前工作树实现，并将本次变更限制在本 refinement 范围内。
