import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { DetectionStats } from "@/utils/types";

/** GET: 获取仪表盘统计数据 */
export async function GET(_request: NextRequest) {
    const recentFrames = store.getRecentFramesForAll(30);
    const recentAlerts = store.getAlerts().slice(0, 20);
    const totalDetections = store.getTotalDetections();
    const behaviorDistribution = store.getBehaviorDistribution();
    const activeCameras = store.getActiveCameraCount();
    const alertsToday = store.getTodayAlertCount();

    const stats: DetectionStats = {
        totalDetections,
        behaviorDistribution,
        activeCameras,
        recentFrames,
        recentAlerts,
        alertsToday,
    };

    return NextResponse.json(stats);
}
