import { exec } from "node:child_process";

export class AdbClient {
	async tap(x: number, y: number) {
		return new Promise((resolve, reject) => {
			exec(`adb shell input tap ${x} ${y}`, (err) => {
				if (err) return reject(err);
				resolve(true);
			});
		});
	}

	async swipe(x1: number, y1: number, x2: number, y2: number) {
		return new Promise((resolve, reject) => {
			exec(`adb shell input swipe ${x1} ${y1} ${x2} ${y2} 300`, (err) => {
				if (err) return reject(err);
				resolve(true);
			});
		});
	}

	async screenshot(): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			exec(
				"adb exec-out screencap -p",
				{ encoding: "buffer" },
				(err, stdout) => {
					if (err) return reject(err);
					resolve(stdout as Buffer);
				},
			);
		});
	}
}
