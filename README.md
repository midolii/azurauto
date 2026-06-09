# AzurAuto

AzurAuto 是一个 monorepo，当前包含 Electron 桌面端和项目自有 ADB / 自动化包。

## 目录

- `apps/desktop`：Electron + TanStack Start 桌面应用。
- `packages/adb`：项目自有 ADB 适配层，封装 `adbkit` 与 `@yume-chan/scrcpy` native 能力。
- `packages/automation`：设备 bootstrap、ATX 检测安装、uiautomator2 截图服务。

## 开发运行

```bash
pnpm install
pnpm --filter desktop prepare:android-resources
pnpm --filter desktop dev
```

`prepare:android-resources` 会下载并整理：

- 当前平台 Android `platform-tools/adb`
- `scrcpy-server.bin`

如果要启用自动安装 ATX 和自动 push uiautomator2，请把以下文件放到：

```text
apps/desktop/resources/android/atx-agent.apk
apps/desktop/resources/android/u2.jar
```

## 打包分发

```bash
pnpm --filter desktop build:app
```

`build:app` 会自动执行：

1. 构建 workspace 依赖。
2. 准备 Android runtime resources。
3. 构建 Electron preload。
4. 构建 renderer。
5. 运行 `electron-builder`。

打包后的应用会携带：

- 内置 ADB：用户不需要额外安装 Android platform-tools。
- scrcpy server：用户不需要手动下载或安装 scrcpy。
- 可选 ATX APK / `u2.jar`：如果构建前放入资源目录，用户不需要手动运行 `python -m uiautomator2 init`。

## 运行时资源优先级

桌面端运行时会优先读取打包资源：

```text
process.resourcesPath/android
```

开发模式读取：

```text
apps/desktop/resources/android
```

也可以用环境变量覆盖 scrcpy server：

```bash
AZURAUTO_SCRCPY_SERVER_PATH=/absolute/path/to/scrcpy-server.bin pnpm --filter desktop dev
```

## 常用命令

```bash
pnpm --filter @azurauto/adb build
pnpm --filter @azurauto/adb test
pnpm --filter @azurauto/automation build
pnpm --filter @azurauto/automation test
pnpm --filter desktop build
```
