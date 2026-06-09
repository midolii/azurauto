// 应用级常量与启动参数。负责品牌、ID、ADB 端口等稳定配置。

export const APP_NAME = "azurauto";
export const APP_ID = "net.midolii.azurauto";
export const AZURAUTO_ADB_SERVER_PORT = Number(
	process.env.AZURAUTO_ADB_SERVER_PORT ?? 15_037,
);
