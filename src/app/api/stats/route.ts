import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { DetectionStats } from "@/utils/types";

/** GET: 获取仪表盘统计数据 */
export async function GET(_request: NextRequest) {
    const [
        recentFrames,
        totalDetections,
        behaviorDistribution,
        activeCameras,
        alertsToday,
    ] = await Promise.all([
        store.getRecentFramesForAll(30),
        store.getTotalDetections(),
        store.getBehaviorDistribution(),
        store.getActiveCameraCount(),
        store.getTodayAlertCount(),
    ]);

    const recentAlerts = await store.getAlerts().then((a) => a.slice(0, 20));

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
