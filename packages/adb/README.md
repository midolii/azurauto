# @azurauto/adb

项目内统一的 ADB 与 scrcpy 适配层。

该包是业务代码接触第三方 ADB/scrcpy SDK 的边界：上层 Electron、preload、renderer 与自动化服务只依赖这里导出的稳定类型和方法，不直接依赖 `adbkit` 或 `@yume-chan/*` 的 native ADB API。

## 职责

- 封装普通 ADB 能力：设备列表、shell、截图、包检测、APK 安装、端口转发、文件推送。
- 将底层 ADB 异常映射为项目内 `AdbError` 和 `AdbErrorCode`。
- 管理嵌入式 scrcpy native 连接：推送 scrcpy server、启动设备端进程、返回视频 metadata 与 packet stream。
- 隔离第三方库导入形态、超时处理和设备端资源流细节。

## 主要导出

```ts
import {
	AdbClient,
	AdbError,
	EmbeddedScrcpyClient,
} from "@azurauto/adb";
```

### `AdbClient`

```ts
const adb = new AdbClient({
	bin: "/path/to/adb",
	timeoutMs: 30_000,
});

const devices = await adb.listDevices();
const result = await adb.shell(devices[0].serial, "getprop ro.product.model");
const screenshot = await adb.screenshot(devices[0].serial);
```

常用方法：

- `listDevices()`：列出 ADB 设备。
- `shell(serial, command)`：执行设备端 shell 命令。
- `screenshot(serial)`：通过 ADB 获取屏幕截图。
- `isPackageInstalled(serial, packageName)`：检测包是否已安装。
- `installApk(serial, apkPath)`：安装 APK。
- `forward(serial, local, remote)`：建立端口转发。
- `pushFile(serial, localPath, remotePath)`：推送文件到设备。

### `EmbeddedScrcpyClient`

```ts
const scrcpy = new EmbeddedScrcpyClient({
	serverPath: "/path/to/scrcpy-server.bin",
	maxFps: 60,
	maxSize: 1080,
});

const session = await scrcpy.start(serial, { maxFps: 60, maxSize: 1080 });
// session.metadata: codec / width / height
// session.stream: scrcpy media packet stream

await scrcpy.stop();
```

`EmbeddedScrcpyClient` 只负责 native ADB/scrcpy 协议层，不负责 Electron IPC、WebCodecs 解码或 canvas 渲染。renderer 侧解码由 desktop 应用处理。

## 资源

默认 scrcpy server 路径来自 `@yume-chan/fetch-scrcpy-server` 包内的 `server.bin`。desktop 打包时通常会显式传入应用资源目录中的 `scrcpy-server.bin`。

可以执行：

```bash
pnpm --filter @azurauto/adb fetch:scrcpy-server
```

## 开发命令

```bash
pnpm --filter @azurauto/adb build
pnpm --filter @azurauto/adb test
```

## 设计约束

- 业务层不要直接导入 `@devicefarmer/adbkit`。
- Electron 主进程不要直接导入 `@yume-chan/adb`、`@yume-chan/adb-scrcpy` 等 native ADB API。
- 新增底层 ADB 能力时，优先在本包补稳定接口，再让上层调用。
