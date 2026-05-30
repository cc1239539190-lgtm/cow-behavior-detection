import { DetectionFrame, AlertRecord, BehaviorStats } from "@/utils/types";

/** 全局内存数据存储 */
class DetectionStore {
    /** cameraId → 最近检测帧列表 */
    private detectionHistory = new Map<string, DetectionFrame[]>();
    /** 所有告警记录 */
    private alerts: AlertRecord[] = [];
    /** 数据保留时间（毫秒） */
    private readonly RETENTION_MS = 10 * 60 * 1000;
    /** 每路摄像头最多保留帧数 */
    private readonly MAX_FRAMES_PER_CAMERA = 300;

    /** 添加一帧检测数据 */
    addDetection(
        cameraId: string,
        frame: DetectionFrame
    ): void {
        const frames = this.detectionHistory.get(cameraId) || [];
        frames.push(frame);

        // 限制帧数
        while (frames.length > this.MAX_FRAMES_PER_CAMERA) {
            frames.shift();
        }

        this.detectionHistory.set(cameraId, frames);
    }

    /** 获取指定摄像头的最近检测帧 */
    getRecentDetections(
        cameraId: string,
        limit = 50
    ): DetectionFrame[] {
        const frames = this.detectionHistory.get(cameraId) || [];
        return frames.slice(-limit);
    }

    /** 获取所有摄像头在最近 timeWindow 秒内的检测帧 */
    getRecentFramesForAll(timeWindowSec = 30): DetectionFrame[] {
        const now = Date.now();
        const cutoff = now - timeWindowSec * 1000;
        const result: DetectionFrame[] = [];

        for (const frames of this.detectionHistory.values()) {
            for (const frame of frames) {
                if (frame.timestamp > cutoff) {
                    result.push(frame);
                }
            }
        }

        return result;
    }

    /** 获取活跃摄像头数量（最近 30 秒有数据） */
    getActiveCameraCount(): number {
        const now = Date.now();
        const cutoff = now - 30 * 1000;
        let count = 0;

        for (const frames of this.detectionHistory.values()) {
            const lastFrame = frames[frames.length - 1];
            if (lastFrame && lastFrame.timestamp > cutoff) {
                count++;
            }
        }

        return count;
    }

    /** 获取指定摄像头最后活跃时间 */
    getLastActiveTime(cameraId: string): number | null {
        const frames = this.detectionHistory.get(cameraId);
        if (!frames || frames.length === 0) return null;
        return frames[frames.length - 1].timestamp;
    }

    /** 获取行为分布统计（基于最近 30 秒数据） */
    getBehaviorDistribution(): BehaviorStats {
        const recentFrames = this.getRecentFramesForAll(30);
        const stats: BehaviorStats = {
            drinking: 0,
            eating: 0,
            resting: 0,
            standing: 0,
            walking: 0,
        };

        for (const frame of recentFrames) {
            for (const det of frame.detections) {
                const cls = det.className as keyof BehaviorStats;
                if (cls in stats) {
                    stats[cls]++;
                }
            }
        }

        return stats;
    }

    /** 获取总检测次数 */
    getTotalDetections(): number {
        let total = 0;
        for (const frames of this.detectionHistory.values()) {
            for (const frame of frames) {
                total += frame.detections.length;
            }
        }
        return total;
    }

    /** 添加告警 */
    addAlert(alert: AlertRecord): void {
        this.alerts.push(alert);
    }

    /** 获取告警列表 */
    getAlerts(acknowledged?: boolean): AlertRecord[] {
        let result = this.alerts;
        if (acknowledged !== undefined) {
            result = result.filter((a) => a.acknowledged === acknowledged);
        }
        // 按时间倒序
        return result.sort(
            (a, b) => b.timestamp - a.timestamp
        );
    }

    /** 确认告警 */
    acknowledgeAlert(id: string): boolean {
        const alert = this.alerts.find((a) => a.id === id);
        if (alert) {
            alert.acknowledged = true;
            return true;
        }
        return false;
    }

    /** 获取今日告警数 */
    getTodayAlertCount(): number {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        return this.alerts.filter(
            (a) => a.timestamp >= todayStart.getTime()
        ).length;
    }

    /** 检查是否存在相同类型的未确认告警（防重复） */
    hasActiveAlert(cameraId: string, type: string): boolean {
        return this.alerts.some(
            (a) =>
                a.cameraId === cameraId &&
                a.type === type &&
                !a.acknowledged
        );
    }

    /** 清理过期数据 */
    cleanup(): void {
        const cutoff = Date.now() - this.RETENTION_MS;

        for (const [cameraId, frames] of this.detectionHistory) {
            const recent = frames.filter((f) => f.timestamp > cutoff);
            if (recent.length === 0) {
                this.detectionHistory.delete(cameraId);
            } else {
                this.detectionHistory.set(cameraId, recent);
            }
        }
    }
}

/** 全局单例 */
export const store = new DetectionStore();

/** 每 5 分钟自动清理一次 */
if (typeof globalThis !== "undefined") {
    const intervalId = setInterval(
        () => store.cleanup(),
        5 * 60 * 1000
    );
    // Node.js 环境下防止定时器阻止进程退出
    if (typeof process !== "undefined") {
        process.on("exit", () => clearInterval(intervalId));
    }
}
