import { db } from "@/lib/db";
import { DetectionFrame, AlertRecord, BehaviorStats } from "@/utils/types";

/** 将 Prisma 返回的帧数据转为应用层 DetectionFrame 格式 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDetectionFrame(f: any): DetectionFrame {
    return {
        timestamp: Number(f.timestamp),
        source: f.source,
        detections: (f.boxes || []).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (b: any) => ({
                x1: b.x1,
                y1: b.y1,
                x2: b.x2,
                y2: b.y2,
                conf: b.conf,
                cls: b.cls,
                className: b.className,
            })
        ),
        frameWidth: f.frameWidth,
        frameHeight: f.frameHeight,
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAlertRecord(a: any): AlertRecord {
    return {
        id: a.id,
        type: a.type,
        severity: a.severity,
        message: a.message,
        timestamp: Number(a.timestamp),
        acknowledged: a.acknowledged,
        cameraId: a.cameraId,
    };
}

/** Prisma 数据访问层 */
export const store = {
    /** 添加一帧检测数据 */
    async addDetection(
        cameraId: string,
        frame: DetectionFrame
    ): Promise<void> {
        await db.detectionFrame.create({
            data: {
                cameraId,
                timestamp: BigInt(frame.timestamp),
                source: frame.source,
                frameWidth: frame.frameWidth,
                frameHeight: frame.frameHeight,
                boxes: {
                    create: frame.detections.map((d) => ({
                        x1: d.x1,
                        y1: d.y1,
                        x2: d.x2,
                        y2: d.y2,
                        conf: d.conf,
                        cls: d.cls,
                        className: d.className,
                    })),
                },
            },
        });
    },

    /** 获取指定摄像头的最近检测帧 */
    async getRecentDetections(
        cameraId: string,
        limit = 50
    ): Promise<DetectionFrame[]> {
        const frames = await db.detectionFrame.findMany({
            where: { cameraId },
            orderBy: { timestamp: "desc" },
            take: limit,
            include: { boxes: true },
        });

        return frames.map(toDetectionFrame).reverse();
    },

    /** 获取所有摄像头在最近 timeWindowSec 秒内的检测帧 */
    async getRecentFramesForAll(
        timeWindowSec = 30
    ): Promise<DetectionFrame[]> {
        const cutoff = BigInt(Date.now() - timeWindowSec * 1000);

        const frames = await db.detectionFrame.findMany({
            where: { timestamp: { gt: cutoff } },
            include: { boxes: true },
            orderBy: { timestamp: "desc" },
            take: 500,
        });

        return frames.map(toDetectionFrame);
    },

    /** 获取活跃摄像头数量（最近30秒有数据） */
    async getActiveCameraCount(): Promise<number> {
        const cutoff = BigInt(Date.now() - 30 * 1000);
        const result = await db.detectionFrame.groupBy({
            by: ["cameraId"],
            where: { timestamp: { gt: cutoff } },
        });
        return result.length;
    },

    /** 获取指定摄像头最后活跃时间 */
    async getLastActiveTime(cameraId: string): Promise<number | null> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const frame: any = await db.detectionFrame.findFirst({
            where: { cameraId },
            orderBy: { timestamp: "desc" },
            select: { timestamp: true },
        });
        return frame ? Number(frame.timestamp) : null;
    },

    /** 获取行为分布统计（基于最近30秒数据） */
    async getBehaviorDistribution(): Promise<BehaviorStats> {
        const cutoff = BigInt(Date.now() - 30 * 1000);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const boxes: any[] = await db.detectionBox.findMany({
            where: { frame: { timestamp: { gt: cutoff } } },
            select: { className: true },
        });

        const stats: BehaviorStats = {
            drinking: 0,
            eating: 0,
            resting: 0,
            standing: 0,
            walking: 0,
        };

        for (const box of boxes) {
            const cls = box.className as keyof BehaviorStats;
            if (cls in stats) {
                stats[cls]++;
            }
        }

        return stats;
    },

    /** 获取总检测次数 */
    async getTotalDetections(): Promise<number> {
        return db.detectionBox.count();
    },

    /** 添加告警 */
    async addAlert(alert: AlertRecord): Promise<void> {
        await db.alert.create({
            data: {
                id: alert.id,
                type: alert.type,
                severity: alert.severity,
                message: alert.message,
                timestamp: BigInt(alert.timestamp),
                acknowledged: alert.acknowledged,
                cameraId: alert.cameraId,
            },
        });
    },

    /** 获取告警列表 */
    async getAlerts(acknowledged?: boolean): Promise<AlertRecord[]> {
        const where = acknowledged !== undefined ? { acknowledged } : {};
        const alerts = await db.alert.findMany({
            where,
            orderBy: { timestamp: "desc" },
        });

        return alerts.map(toAlertRecord);
    },

    /** 确认告警 */
    async acknowledgeAlert(id: string): Promise<boolean> {
        try {
            await db.alert.update({
                where: { id },
                data: { acknowledged: true },
            });
            return true;
        } catch {
            return false;
        }
    },

    /** 获取今日告警数 */
    async getTodayAlertCount(): Promise<number> {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        return db.alert.count({
            where: {
                timestamp: { gte: BigInt(todayStart.getTime()) },
            },
        });
    },

    /** 检查是否存在相同类型的未确认告警（防重复） */
    async hasActiveAlert(
        cameraId: string,
        type: string
    ): Promise<boolean> {
        const count = await db.alert.count({
            where: {
                cameraId,
                type,
                acknowledged: false,
            },
        });
        return count > 0;
    },

    /** 清理过期数据（保留最近10分钟） */
    async cleanup(): Promise<void> {
        const cutoff = BigInt(Date.now() - 10 * 60 * 1000);
        await db.detectionFrame.deleteMany({
            where: { timestamp: { lt: cutoff } },
        });
    },
};
