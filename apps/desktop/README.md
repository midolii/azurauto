# AzurAuto Desktop

AzurAuto Desktop 是基于 Electron、TanStack Start、React 和 Tailwind CSS 的桌面应用，用于连接 Android 模拟器并承载后续游戏自动化能力。

## 功能概览

- 启动应用后自动检查本机 ADB 是否可用。
- 自动识别已连接且状态为 `device` 的模拟器或 Android 设备。
- 检查目标设备是否安装 ATX（小黄车自动化）组件。
- 当 ATX 缺失时尝试自动安装，并在界面中展示当前状态、错误原因和重试入口。
- 通过 Electron preload 暴露 `window.environment`，渲染层只读取环境状态，不直接访问原始 ADB/shell 能力。

## 环境要求

- Node.js 与 pnpm，版本以仓库根目录 `package.json` 的 `packageManager` 为准。
- Android platform-tools，并确保 `adb` 可以在当前 shell 中执行。
- 已启动的 Android 模拟器或已连接并授权的 Android 设备。
- 可选：ATX 安装包路径，通过 `AZURAUTO_ATX_APK_PATH` 指定。
- 使用内嵌 scrcpy 预览前，需要下载一次 scrcpy server：

```bash
pnpm --filter desktop fetch:scrcpy-server
```

如需使用自定义 server 文件，可设置：

```bash
export AZURAUTO_SCRCPY_SERVER_PATH=/absolute/path/to/scrcpy-server.jar
```

```bash
export AZURAUTO_ATX_APK_PATH=/absolute/path/to/atx.apk
```

如果未配置 ATX 安装包，应用仍会完成 ADB/设备检查；当设备缺少 ATX 时会进入可恢复的失败状态，并提示配置安装资源后重试。

## 开发

在仓库根目录安装依赖：

```bash
pnpm install
```

启动桌面应用：

```bash
pnpm --filter desktop dev
```

也可以在 `apps/desktop` 目录下运行：

```bash
pnpm dev
```

## 构建

构建 Web 渲染层：

```bash
pnpm --filter desktop build
```

构建桌面安装包：

```bash
pnpm --filter desktop build:app
```

`build:app` 会先构建 workspace 依赖包，包括 `@azurauto/adb` 和 `@azurauto/automation`。

## 测试与检查

运行 desktop 测试：

```bash
pnpm --filter desktop test
```

运行 ADB 与自动化包测试：

```bash
pnpm --filter @azurauto/adb test
pnpm --filter @azurauto/automation test
```

运行 Biome：

```bash
pnpm --filter desktop lint
pnpm --filter desktop format
pnpm --filter desktop check
```

## Native / Preload API

正式渲染层 API 挂载在 `window.environment`：

- `getBootstrapStatus()`：读取当前 ADB/ATX bootstrap 状态。
- `runBootstrap()`：手动重新执行环境检查和可恢复安装流程。

scrcpy 投屏能力挂载在独立作用域 `window.scrcpy`：

- `startPreview()`：启动基于 `@yume-chan/scrcpy` 的内嵌预览。
- `stopPreview()`：停止内嵌预览。
- `getPreviewStatus()`：读取预览状态。
- `onVideoEvent()`：订阅主进程传来的 scrcpy 视频元数据和视频包，由渲染层 WebCodecs 解码到 canvas。

当前不再保留测试用途的 `window.bot.tap`、`window.bot.swipe` 和 `window.bot.screenshot`。后续如果需要游戏截图、点击或滑动能力，应在自动化服务层设计稳定接口，再通过最小化 preload API 暴露给渲染层。

## ADB/ATX 状态说明

应用启动后会进入以下状态之一：

- `checking-adb`：正在检查 ADB 与设备列表。
- `no-adb`：本机无法执行 ADB，需要安装或配置 Android platform-tools。
- `no-device`：未发现可用设备，或设备处于 unauthorized/offline 状态。
- `checking-atx`：已发现设备，正在检查 ATX。
- `installing-atx`：设备缺少 ATX，正在尝试自动安装。
- `ready`：ADB 设备和 ATX 均可用。
- `failed`：自动检查或安装失败，可根据界面提示修复后重试。

## 目录说明

- `electron/`：Electron main、IPC、preload 和 native 编排代码。
- `src/routes/`：TanStack Router 页面。
- `src/types/`：渲染层全局类型声明。
- `../../packages/adb`：项目自有 ADB 适配层，内部封装第三方 ADB 库。
- `../../packages/automation`：设备 bootstrap、ATX 检测和安装编排服务。
