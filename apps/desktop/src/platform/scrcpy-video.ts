import {
	BitmapVideoFrameRenderer,
	WebCodecsVideoDecoder,
	WebGLVideoFrameRenderer,
} from "@yume-chan/scrcpy-decoder-webcodecs";
import type {
	ScrcpyVideoCodecId,
	ScrcpyVideoPacket,
} from "../../electron/ipc/contract/index.ts";
import {
	createCapability,
	PLATFORM_VIDEO_DECODER_UNAVAILABLE,
	type PlatformCapability,
} from "./capabilities.ts";

export type ScrcpyRenderer =
	| InstanceType<typeof WebGLVideoFrameRenderer>
	| InstanceType<typeof BitmapVideoFrameRenderer>;

export type ScrcpyVideoDecoder = InstanceType<typeof WebCodecsVideoDecoder>;

export function getScrcpyVideoDecoderCapability(): PlatformCapability {
	if (!WebCodecsVideoDecoder.isSupported) {
		return createCapability(
			"unavailable",
			"当前 WebContents 不支持 WebCodecs，无法内嵌 scrcpy。",
			{
				errorCode: PLATFORM_VIDEO_DECODER_UNAVAILABLE,
				nextAction:
					"请切换到 uiautomator2 截图预览，或使用支持 WebCodecs 的桌面运行环境。",
			},
		);
	}

	return createCapability("available", "scrcpy WebCodecs 解码能力可用。", {
		recoverable: false,
	});
}

export function createScrcpyRenderer(): ScrcpyRenderer {
	return WebGLVideoFrameRenderer.isSupported
		? new WebGLVideoFrameRenderer()
		: new BitmapVideoFrameRenderer();
}

export function createScrcpyVideoDecoder({
	codec,
	renderer,
}: {
	codec: ScrcpyVideoCodecId;
	renderer: ScrcpyRenderer;
}): ScrcpyVideoDecoder {
	return new WebCodecsVideoDecoder({
		codec: codec as never,
		renderer,
		hardwareAcceleration: "no-preference",
	});
}

export function getScrcpyPacketWriter(
	decoder: ScrcpyVideoDecoder,
): WritableStreamDefaultWriter<ScrcpyVideoPacket> {
	return decoder.writable.getWriter() as WritableStreamDefaultWriter<ScrcpyVideoPacket>;
}
