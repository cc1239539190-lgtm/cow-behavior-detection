"use client";

import { useState, useEffect, useCallback } from "react";
import { BehaviorStats, DetectionStats } from "@/utils/types";

const CLASS_NAMES = ["drinking", "eating", "resting", "standing", "walking"];
const CLASS_LABELS: Record<string, string> = {
    drinking: "饮水",
    eating: "进食",
    resting: "休息",
    standing: "站立",
    walking: "行走",
};
const CLASS_COLORS: Record<string, string> = {
    drinking: "#3b82f6",
    eating: "#22c55e",
    resting: "#f59e0b",
    standing: "#8b5cf6",
    walking: "#ef4444",
};

export default function StatsPanel() {
    const [stats, setStats] = useState<DetectionStats | null>(null);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch("/api/stats");
            if (res.ok) {
                const data: DetectionStats = await res.json();
                setStats(data);
            }
        } catch {
            // 静默失败
        }
    }, []);

    /** 每 3 秒刷新 */
    useEffect(() => {
        fetchStats();
        const timer = setInterval(fetchStats, 3000);
        return () => clearInterval(timer);
    }, [fetchStats]);

    /** 计算总检测数 */
    const totalInDistribution = (dist: BehaviorStats) =>
        dist.drinking + dist.eating + dist.resting + dist.standing + dist.walking;

    /** 计算百分比 */
    const percentage = (count: number, total: number) =>
        total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";

    if (!stats) {
        return (
            <div className="text-center py-8 text-gray-400">
                正在加载统计数据...
            </div>
        );
    }

    const total = totalInDistribution(stats.behaviorDistribution);

    return (
        <div>
            {/* 概览卡片 */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">
                        {stats.activeCameras}
                    </p>
                    <p className="text-xs text-blue-600">活跃摄像头</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">
                        {stats.totalDetections}
                    </p>
                    <p className="text-xs text-green-600">累计检测</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-700">
                        {stats.alertsToday}
                    </p>
                    <p className="text-xs text-red-600">今日告警</p>
                </div>
            </div>

            {/* 行为分布柱状图 */}
            <h3 className="text-lg font-bold text-gray-700 mb-3">
                实时行为分布
                {total > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-400">
                        (近30秒共{total}次)
                    </span>
                )}
            </h3>

            <div className="space-y-2">
                {CLASS_NAMES.map((cls) => {
                    const count =
                        stats.behaviorDistribution[
                            cls as keyof BehaviorStats
                        ];
                    const pct = parseFloat(percentage(count, total));
                    const color = CLASS_COLORS[cls];
                    return (
                        <div key={cls} className="flex items-center gap-2">
                            <span className="w-12 text-sm text-gray-600 shrink-0">
                                {CLASS_LABELS[cls]}
                            </span>
                            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-1"
                                    style={{
                                        width: `${Math.max(pct, 2)}%`,
                                        backgroundColor: color,
                                    }}
                                >
                                    {pct > 8 && (
                                        <span className="text-xs text-white font-bold">
                                            {pct}%
                                        </span>
                                    )}
                                </div>
                            </div>
                            <span className="w-8 text-right text-sm font-bold text-gray-700 shrink-0">
                                {count}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* 无数据提示 */}
            {total === 0 && (
                <p className="text-center text-gray-400 text-sm mt-4">
                    暂无检测数据，请确保摄像头正在运行并检测到牛只
                </p>
            )}
        </div>
    );
}
