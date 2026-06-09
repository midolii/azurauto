# @azurauto/automation

设备自动化启动与截图能力包。

该包负责把 ADB 设备检查、ATX/uiautomator2 资源检查、自动安装、状态流转和截图源封装为稳定服务。上层 Electron 主进程只创建并调用服务，不直接编排底层 ADB 命令细节。

## 职责

- 检查 ADB 是否可用。
- 选择可用设备，并识别未授权、offline、无设备等可恢复状态。
- 检查 ATX/uiautomator2 相关包是否已安装。
- 在缺少 ATX 时执行安装策略。
- 维护统一的 bootstrap 状态机。
- 通过 uiautomator2 JSON-RPC 获取截图帧。

## 主要导出

```ts
import {
	DeviceBootstrapService,
	Uiautomator2ScreenshotSource,
	createDefaultAtxInstallStrategy,
} from "@azurauto/automation";
```

### `DeviceBootstrapService`

```ts
const service = new DeviceBootstrapService({
	onStatusChange(status) {
		console.log(status.phase, status.message);
	},
});

const status = await service.run();

if (status.phase === "ready") {
	const frame = await service.captureScreenshot();
	// frame.data 是 Uint8Array，可直接传给 renderer 生成 Blob/Object URL
}
```

状态阶段：

- `idle`：等待检查。
- `checking-adb`：检查 ADB 和设备。
- `no-adb`：ADB 不可用。
- `no-device`：没有可用设备、设备 offline 或未授权。
- `checking-atx`：检查 ATX 自动化组件。
- `installing-atx`：正在安装 ATX。
- `ready`：设备和自动化组件已就绪。
- `failed`：检查或安装失败。

### `createDefaultAtxInstallStrategy`

```ts
const atx = createDefaultAtxInstallStrategy(
	"/path/to/atx-agent.apk",
	"com.github.uiautomator",
);

const service = new DeviceBootstrapService({ atx });
```

如果没有传入 `apkPath`，默认读取 `AZURAUTO_ATX_APK_PATH`。当安装包不存在时会返回可恢复错误，提示调用方引导用户补充资源。

### `Uiautomator2ScreenshotSource`

```ts
const screenshotSource = new Uiautomator2ScreenshotSource(adb, {
	jarPath: "/path/to/u2.jar",
	localPort: 19008,
	jsonRpcPort: 9008,
	requestTimeoutMs: 3000,
});
```

截图流程：

1. 建立 ADB forward：`tcp:localPort -> tcp:jsonRpcPort`。
2. 如果 JSON-RPC 不可用，确认设备端 `/data/local/tmp/u2.jar` 是否存在。
3. 缺少 `u2.jar` 时通过 `AdbClient.pushFile` 推送。
4. 使用 `app_process` 启动 uiautomator2 JSON-RPC server。
5. 调用 `takeScreenshot` 并返回 `Buffer`/`Uint8Array` 截图数据。

## 自定义依赖

可以注入自定义 ADB、ATX 安装策略或截图源，便于测试和替换实现：

```ts
const service = new DeviceBootstrapService({
	adb,
	atx,
	screenshotSource,
});
```

## 开发命令

```bash
pnpm --filter @azurauto/automation build
pnpm --filter @azurauto/automation test
```

## 设计约束

- 本包只依赖 `@azurauto/adb` 的稳定接口，不直接依赖第三方 ADB SDK。
- bootstrap 状态必须可恢复、可展示，错误要映射为 `BootstrapErrorCode`。
- 截图数据使用 `Buffer`/`Uint8Array` 传递，不在业务层强制转 base64。
- 实时预览不应使用 uiautomator2 轮询截图；高帧率预览应走 desktop 的 scrcpy 渲染链路。
