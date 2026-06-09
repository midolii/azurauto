## ADDED Requirements

### Requirement: Cohesive command-center visual system
desktop React renderer SHALL 使用统一的默认明亮 **Light Command Center / Developer Dashboard** 视觉系统，覆盖 shell、navigation、pages、panels、status badges、controls、logs、startup loading 和 settings placeholders。

#### Scenario: User opens the desktop app
- **WHEN** desktop renderer 加载完成
- **THEN** 应用呈现统一的明亮操作型界面，而不是混合装饰性 light/glass 和 dark panel 风格

#### Scenario: User navigates between sections
- **WHEN** 用户在首页、调试页、日志页和设置页之间切换
- **THEN** 每个 section 都使用一致的 surface colors、borders、typography、spacing 和 icon treatment

### Requirement: Status-first runtime controls
desktop UI SHALL 通过一致的 status variants 和 primary controls 清晰展示 script runtime state、task state 和 resource readiness。

#### Scenario: Runtime is idle and resources are ready
- **WHEN** runtime 处于 idle 且 resources ready
- **THEN** start control 可用，并被视觉呈现为主要运行操作

#### Scenario: Runtime is starting or pausing
- **WHEN** runtime phase 表示正在 starting 或 pausing
- **THEN** UI 显示 loading state，并避免用户触发含义不明确的重复 runtime actions

#### Scenario: Runtime reports an error or recoverable resource issue
- **WHEN** runtime 或 environment status 包含 error、warning 或 next action
- **THEN** UI 使用可访问且视觉明确的状态展示该消息，并且不只依赖颜色表达状态

### Requirement: Operational logs remain readable
logs page SHALL 使用 terminal-inspired panel 展示 runtime、environment 和 timing logs，并优化 level、scope、timestamp、message 和 duration 的扫描效率。

#### Scenario: Logs are empty
- **WHEN** 没有 log entries
- **THEN** logs panel 显示清晰 empty state，说明日志何时会出现

#### Scenario: Logs are populated
- **WHEN** log entries 存在
- **THEN** 每一行显示 timestamp、level、scope、optional duration 和 message，并保持一致 spacing 与可读 contrast

#### Scenario: User clears logs
- **WHEN** 用户清空 logs
- **THEN** UI 保留现有 clear behavior，并返回 empty log state

### Requirement: Debug and preview panels preserve behavior
debug UI SHALL 改善 ADB/environment status、uiautomator screenshots 和 scrcpy preview controls 的 command-center 呈现方式，同时不得改变现有 preview behavior。

#### Scenario: Environment is not ready
- **WHEN** environment status 处于 loading、unavailable 或 recoverable
- **THEN** debug page 清晰展示 current phase、message、next action 和 retry/connect control，并提供明确 disabled/loading feedback

#### Scenario: uiautomator preview is waiting or streaming
- **WHEN** screenshot capture 正在等待 frames 或正在显示 frames
- **THEN** preview panel 保留现有 image behavior，并以一致的 command-center cards 展示 status、FPS、device 和 frame time

#### Scenario: scrcpy controls are used
- **WHEN** 用户修改 scrcpy options 或切换 scrcpy preview
- **THEN** 现有 option 和 toggle behavior 保持不变，同时 controls 具备 accessible focus、disabled 和 busy states

### Requirement: Accessibility and interaction feedback
desktop UI SHALL 在所有 interactive elements 中提供 accessible contrast、focus states、hover feedback、disabled states、reduced-motion support 和清晰的 loading/error feedback。

#### Scenario: Keyboard user navigates controls
- **WHEN** keyboard user 通过 Tab 访问 navigation、runtime controls、buttons、selects 和 log actions
- **THEN** 每个 focused control 都有可见 focus indicator

#### Scenario: User prefers reduced motion
- **WHEN** 操作系统或浏览器声明 reduced motion preference
- **THEN** page transitions 和 decorative animations 被最小化或禁用

#### Scenario: Operation takes more than a short moment
- **WHEN** runtime start、connect/retry 或 preview startup 正在进行
- **THEN** UI 显示 loading 或 busy feedback，而不是看起来像冻结

### Requirement: Startup loading screens match the app style
Electron startup splash 和 React resource loading screen SHALL 使用与默认明亮命令中心一致的视觉语言，并清晰表达启动阶段不会自动连接 ADB。

#### Scenario: Electron renderer server is starting
- **WHEN** Electron 主窗口先加载 startup splash
- **THEN** splash 使用 light command-center 风格展示 AzurAuto、启动状态和简洁 loading feedback

#### Scenario: React prepares local resources
- **WHEN** React app 正在 checking 或 downloading startup resources
- **THEN** resource loading screen 使用与主界面一致的浅色背景、状态卡片和当前 resource message
