## 1. 设计系统基础

- [x] 1.1 更新 `apps/desktop/src/styles.css` 的字体 import 和 theme tokens，切换到默认明亮的 Light Command Center 色板，包括 light slate backgrounds、white/pale panels、borders、绿色运行状态、琥珀色警告、红色错误、蓝/青色信息强调和可读 foreground colors。
- [x] 1.2 将装饰性的 coastal/glass 全局背景替换为克制的 light command-center 背景、grid/gradient accents、code/log typography、focus rings 和 reduced-motion-safe transitions。
- [x] 1.3 审核 desktop renderer 当前使用的 shadcn-style primitives；除非 primitive 级样式阻碍一致的 focus、hover 或 disabled states，否则只调整 renderer 层 class usage。

## 2. App Shell 与导航

- [x] 2.1 重构 `DesktopAppShell`，使用深色 desktop frame、稳定 page panel、克制 transition behavior，并保留 reduced-motion handling。
- [x] 2.2 将 `AppSidebar` 重构为 command-center sidebar，清晰展示 app identity、runtime status summary、task status、resource readiness、navigation states 和 primary start/pause control。
- [x] 2.3 确保 sidebar runtime control 保留现有 `window.runtime.start()`、`window.runtime.pause()`、toast feedback、disabled behavior 和 store updates。
- [x] 2.4 重构 `PageFrame`，为所有 desktop pages 提供一致的 command-panel headers、body surfaces、spacing 和 responsive layout containers。

## 3. 页面重构

- [x] 3.1 将 `HomePage` 从单纯欢迎页重构为 compact command-center overview，解释 idle behavior、start flow、current task 和 key status checkpoints，同时不改变 app logic。
- [x] 3.2 将 `TaskExecutionPage` 重构为 terminal-inspired log console，提供可读 empty state、level/scope/duration badges、clear action state，并保留 log clearing behavior。
- [x] 3.3 重构 `DebugPage` layout，将 environment status 和 preview tools 组织为 operational panels，并保持一致 hierarchy 与 max-width behavior。
- [x] 3.4 重构 `SettingsPage` placeholder，使其匹配 command-center design，同时保留 simulated config loading behavior。
- [x] 3.5 重构 React `StartupLoadingScreen`，使资源准备 loading 与默认明亮命令中心风格一致。

## 4. 状态、调试与预览组件

- [x] 4.1 重构 `EnvironmentStatusSection`，用一致且可访问的 status variants 展示 phase、message、retry/connect action、next action、device serial、error code 和 update time。
- [x] 4.2 重构 `PreviewSection` 的 uiautomator panel，同时保留 screenshot frame rendering、FPS updates、status values、error handling 和 existing hooks。
- [x] 4.3 重构 `PreviewSection` 的 scrcpy panel，同时保留 canvas host refs、FPS/resolution controls、disabled conditions、busy states、toggle behavior 和 status message rendering。
- [x] 4.4 按需重构 `StatusItem` 及相关可复用 status display components，以支持 command-center card/badge language。
- [x] 4.5 重构 Electron `startup-splash.html`，使主窗口早期 splash 与 React loading 和主界面风格一致。

## 5. 可访问性与验证

- [x] 5.1 验证 interactive elements 具备 visible focus states、合适的 pointer/hover feedback、accessible disabled states，以及不只依赖颜色表达的 error/warning cues。
- [x] 5.2 验证 reduced-motion users 不会收到不必要的 page 或 panel animation。
- [x] 5.3 运行 `npm --workspace apps/desktop run check` 或项目等价的 desktop check command，并修复本次重构引入的 formatting、linting 或 type issues。
- [ ] 5.4 手动检查 desktop UI 的代表状态：Electron splash、React resources loading、idle、resources loading、recoverable environment issue、runtime starting、runtime running、runtime paused、empty logs、populated logs、preview disabled 和 preview streaming。
