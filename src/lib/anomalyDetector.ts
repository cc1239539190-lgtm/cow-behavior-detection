import { DetectionFrame, AlertRecord } from "@/utils/types";
import { store } from "./store";

/** 每个摄像头的监测状态 */
interface CameraState {
    /** 连续检测到 resting 的起始时间 */
    restingStartTime: number | null;
    /** 最后一次收到数据的时间 */
    lastDataTime: number;
    /** 已触发的告警级别（用于防止重复告警） */
    alertLevel: "none" | "warning" | "critical";
    /** 是否已触发离线告警 */
    offlineAlertSent: boolean;
}

/** 告警阈值配置 */
const THRESHOLDS = {
    /** 连续躺卧超过此时间触发警告（毫秒） */
    RESTING_WARNING_MS: 3 * 60 * 1000,
    /** 连续躺卧超过此时间触发严重告警（毫秒） */
    RESTING_CRITICAL_MS: 10 * 60 * 1000,
    /** 无数据超过此时间触发离线告警（毫秒） */
    OFFLINE_WARNING_MS: 30 * 1000,
};

class AnomalyDetector {
    private cameraStates = new Map<string, CameraState>();

    /** 生成唯一告警ID */
    private genAlertId(): string {
        return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    /** 获取或创建摄像头状态 */
    private getState(cameraId: string): CameraState {
        if (!this.cameraStates.has(cameraId)) {
            this.cameraStates.set(cameraId, {
                restingStartTime: null,
                lastDataTime: Date.now(),
                alertLevel: "none",
                offlineAlertSent: false,
            });
        }
        return this.cameraStates.get(cameraId)!;
    }

    /** 检测当前帧是否包含 resting 行为 */
    private hasRestingBehavior(frame: DetectionFrame): boolean {
        return frame.detections.some((d) => d.className === "resting");
    }

    /** 分析一帧数据，返回是否需要发起告警 */
    analyzeFrame(
        cameraId: string,
        frame: DetectionFrame
    ): { triggered: boolean; alert?: AlertRecord } {
        const state = this.getState(cameraId);
        const now = Date.now();

        state.lastDataTime = now;
        state.offlineAlertSent = false;
        const hasResting = this.hasRestingBehavior(frame);

        // ---- 处理躺卧状态机 ----
        if (hasResting && state.restingStartTime === null) {
            // 开始躺卧计时
            state.restingStartTime = now;
            state.alertLevel = "none";
        } else if (hasResting && state.restingStartTime !== null) {
            // 持续躺卧中，检查是否超过阈值
            const restingDuration = now - state.restingStartTime;

            if (
                restingDuration >= THRESHOLDS.RESTING_CRITICAL_MS &&
                state.alertLevel !== "critical"
            ) {
                state.alertLevel = "critical";
                const alert: AlertRecord = {
                    id: this.genAlertId(),
                    type: "cow_down",
                    severity: "critical",
                    message: `紧急：牛只异常躺卧超过${
                        Math.floor(restingDuration / 60000)
                    }分钟！`,
                    timestamp: now,
                    acknowledged: false,
                    cameraId,
                };
                store.addAlert(alert);
                return { triggered: true, alert };
            } else if (
                restingDuration >= THRESHOLDS.RESTING_WARNING_MS &&
                state.alertLevel === "none"
            ) {
                state.alertLevel = "warning";
                const alert: AlertRecord = {
                    id: this.genAlertId(),
                    type: "cow_down",
                    severity: "warning",
                    message: `检测到牛只长时间躺卧（${Math.floor(
                        restingDuration / 60000
                    )}分钟）`,
                    timestamp: now,
                    acknowledged: false,
                    cameraId,
                };
                store.addAlert(alert);
                return { triggered: true, alert };
            }
        } else if (!hasResting && state.restingStartTime !== null) {
            // 躺卧结束，重置状态
            state.restingStartTime = null;
            state.alertLevel = "none";
        }

        return { triggered: false };
    }

    /** 检查所有摄像头是否有离线 */
    checkOffline(): AlertRecord[] {
        const now = Date.now();
        const newAlerts: AlertRecord[] = [];

        for (const [cameraId, state] of this.cameraStates) {
            const sinceLastData = now - state.lastDataTime;
            if (
                sinceLastData > THRESHOLDS.OFFLINE_WARNING_MS &&
                !state.offlineAlertSent
            ) {
                state.offlineAlertSent = true;
                const alert: AlertRecord = {
                    id: this.genAlertId(),
                    type: "camera_offline",
                    severity: "warning",
                    message: `摄像头 ${cameraId} 可能离线，${Math.floor(
                        sinceLastData / 1000
                    )}秒无检测数据`,
                    timestamp: now,
                    acknowledged: false,
                    cameraId,
                };
                store.addAlert(alert);
                newAlerts.push(alert);
            }
        }

        return newAlerts;
    }

    /** 获取摄像头当前状态摘要 */
    getStatus(cameraId: string): {
        resting: boolean;
        restingDuration: number;
        alertLevel: "none" | "warning" | "critical";
        offline: boolean;
    } {
        const state = this.getState(cameraId);
        const now = Date.now();
        const resting = state.restingStartTime !== null;
        const restingDuration = resting
            ? now - state.restingStartTime!
            : 0;

        return {
            resting,
            restingDuration,
            alertLevel: state.alertLevel,
            offline:
                now - state.lastDataTime > THRESHOLDS.OFFLINE_WARNING_MS,
        };
    }
}

/** 全局单例 */
export const anomalyDetector = new AnomalyDetector();

/** 每 15 秒检查一次离线状态 */
if (typeof globalThis !== "undefined") {
    setInterval(() => {
        anomalyDetector.checkOffline();
    }, 15 * 1000);
}
