import { DetectionBox, DetectionRequest, DetectionResponse } from "./types";

interface DataSenderConfig {
    /** 摄像头标识 */
    cameraId: string;
    /** 发送间隔（毫秒），默认 2000 */
    intervalMs?: number;
    /** 收到告警时的回调 */
    onAlert?: (message: string, severity: string) => void;
}

class DataSender {
    private cameraId = "default";
    private intervalMs = 2000;
    private timer: ReturnType<typeof setInterval> | null = null;
    private pendingDetections: DetectionBox[] = [];
    private frameWidth = 0;
    private frameHeight = 0;
    private source: "image" | "video" | "camera" = "camera";
    private sending = false;
    private onAlert: ((message: string, severity: string) => void) | null =
        null;

    /** 配置发送器 */
    configure(config: DataSenderConfig): void {
        this.cameraId = config.cameraId;
        if (config.intervalMs) this.intervalMs = config.intervalMs;
        if (config.onAlert) this.onAlert = config.onAlert;
    }

    /** 缓存一帧的检测结果 */
    cacheDetections(
        detections: DetectionBox[],
        frameWidth: number,
        frameHeight: number,
        source: "image" | "video" | "camera" = "camera"
    ): void {
        if (detections.length > 0) {
            this.pendingDetections = [...detections];
        } else {
            this.pendingDetections = [];
        }
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;
        this.source = source;
    }

    /** 启动定时发送 */
    startSending(): void {
        if (this.timer) return;
        this.timer = setInterval(() => {
            this.flush();
        }, this.intervalMs);
    }

    /** 停止发送 */
    stopSending(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.pendingDetections = [];
    }

    /** 是否正在发送 */
    isSending(): boolean {
        return this.timer !== null;
    }

    /** 立即发送一批数据 */
    async flush(): Promise<void> {
        if (this.sending) return;

        const body: DetectionRequest = {
            cameraId: this.cameraId,
            source: this.source,
            detections: this.pendingDetections,
            frameWidth: this.frameWidth,
            frameHeight: this.frameHeight,
        };

        this.sending = true;

        try {
            const res = await fetch("/api/detection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                const data: DetectionResponse = await res.json();
                if (
                    data.status !== "normal" &&
                    data.message &&
                    this.onAlert
                ) {
                    this.onAlert(data.message, data.status);
                }
            }
        } catch {
            // 静默失败，下一轮重试
        } finally {
            this.sending = false;
        }
    }
}

/** 全局单例 */
export const dataSender = new DataSender();
