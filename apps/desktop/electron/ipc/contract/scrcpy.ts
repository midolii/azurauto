import type {
	EmbeddedScrcpyVideoMetadata,
	EmbeddedScrcpyVideoPacket,
} from "@azurauto/adb";

export type ScrcpyPreviewStatus = {
	running: boolean;
	serial?: string;
	message: string;
	updatedAt: string;
};

export type ScrcpyPreviewConfig = {
	maxFps: number;
	maxSize: number;
};

export type ScrcpyVideoMetadata = EmbeddedScrcpyVideoMetadata;

export type ScrcpyVideoPacket = EmbeddedScrcpyVideoPacket;

export type ScrcpyVideoEvent =
	| {
			type: "metadata";
			metadata: ScrcpyVideoMetadata;
	  }
	| {
			type: "packet";
			packet: ScrcpyVideoPacket;
	  }
	| {
			type: "error";
			message: string;
	  }
	| {
			type: "closed";
			message: string;
	  };

export type ScrcpyIpcContract = {
	"scrcpy:startPreview": {
		payload: ScrcpyPreviewConfig;
		result: ScrcpyPreviewStatus;
	};
	"scrcpy:stopPreview": {
		result: ScrcpyPreviewStatus;
	};
	"scrcpy:getPreviewStatus": {
		result: ScrcpyPreviewStatus;
	};
};

export const scrcpyIpcChannels = {
	startPreview: "scrcpy:startPreview",
	stopPreview: "scrcpy:stopPreview",
	getPreviewStatus: "scrcpy:getPreviewStatus",
} as const satisfies Record<string, keyof ScrcpyIpcContract>;

export const scrcpyRendererEventChannels = {
	videoEvent: "scrcpy:videoEvent",
} as const;
