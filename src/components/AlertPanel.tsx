"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertRecord } from "@/utils/types";

interface AlertPanelProps {
    /** 是否在监控页面中嵌入（嵌入式不显示弹窗） */
    embedded?: boolean;
}

export default function AlertPanel({ embedded = false }: AlertPanelProps) {
    const [alerts, setAlerts] = useState<AlertRecord[]>([]);
    const [showBanner, setShowBanner] = useState(false);
    const [latestAlert, setLatestAlert] = useState<AlertRecord | null>(null);
    const [lastAlertId, setLastAlertId] = useState<string | null>(null);

    /** 播放提示音 */
    const playAlertSound = useCallback(() => {
        try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = "square";
            gain.gain.value = 0.1;
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
            setTimeout(() => {
                const osc2 = ctx.createOscillator();
                osc2.connect(gain);
                osc2.frequency.value = 660;
                osc2.type = "square";
                osc2.start();
                osc2.stop(ctx.currentTime + 0.2);
            }, 200);
        } catch {
            // 音频播放失败时静默
        }
    }, []);

    /** 加载告警列表 */
    const fetchAlerts = useCallback(async () => {
        try {
            const res = await fetch("/api/alerts?acknowledged=false&limit=20");
            if (res.ok) {
                const data = await res.json();
                setAlerts(data.alerts);

                // 检测新告警
                if (data.alerts.length > 0) {
                    const newest = data.alerts[0];
                    if (newest.id !== lastAlertId) {
                        setLastAlertId(newest.id);
                        setLatestAlert(newest);
                        if (!embedded) {
                            setShowBanner(true);
                            playAlertSound();
                            // 10 秒后自动隐藏横幅
                            setTimeout(() => setShowBanner(false), 10000);
                        }
                    }
                }
            }
        } catch {
            // 静默失败
        }
    }, [lastAlertId, embedded, playAlertSound]);

    /** 确认告警 */
    const acknowledgeAlert = async (id: string) => {
        try {
            await fetch("/api/alerts", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, acknowledged: true }),
            });
            setAlerts((prev) =>
                prev.filter((a) => a.id !== id)
            );
            setShowBanner(false);
        } catch {
            // 静默失败
        }
    };

    /** 轮询告警 */
    useEffect(() => {
        fetchAlerts();
        const timer = setInterval(fetchAlerts, 3000);
        return () => clearInterval(timer);
    }, [fetchAlerts]);

    /** 格式化时间 */
    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString("zh-CN", { hour12: false });
    };

    /** 严重等级标签样式 */
    const severityStyle = (s: string) => {
        switch (s) {
            case "critical":
                return "bg-red-600 text-white";
            case "warning":
                return "bg-yellow-500 text-black";
            default:
                return "bg-gray-400 text-white";
        }
    };

    /** 严重等级中文 */
    const severityLabel = (s: string) => {
        switch (s) {
            case "critical":
                return "严重";
            case "warning":
                return "警告";
            default:
                return "信息";
        }
    };

    return (
        <>
            {/* 弹窗横幅（非嵌入模式） */}
            {!embedded && showBanner && latestAlert && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
                    <div
                        className={`flex items-center gap-4 px-6 py-4 rounded-lg shadow-2xl border-2 ${
                            latestAlert.severity === "critical"
                                ? "bg-red-50 border-red-500"
                                : "bg-yellow-50 border-yellow-500"
                        }`}
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span
                                    className={`px-2 py-0.5 rounded text-xs font-bold ${severityStyle(
                                        latestAlert.severity
                                    )}`}
                                >
                                    {severityLabel(latestAlert.severity)}
                                </span>
                                <span className="text-sm text-gray-500">
                                    {formatTime(latestAlert.timestamp)}
                                </span>
                            </div>
                            <p className="mt-1 font-bold text-gray-800">
                                {latestAlert.message}
                            </p>
                        </div>
                        <button
                            onClick={() =>
                                acknowledgeAlert(latestAlert.id)
                            }
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap font-bold"
                        >
                            确认处理
                        </button>
                    </div>
                </div>
            )}

            {/* 告警列表 */}
            <div className={embedded ? "" : "mt-4"}>
                <h3 className="text-lg font-bold text-gray-700 mb-3">
                    告警记录
                    {alerts.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                            {alerts.length}
                        </span>
                    )}
                </h3>

                {alerts.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">
                        暂无告警记录
                    </p>
                ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {alerts.map((alert) => (
                            <div
                                key={alert.id}
                                className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                                    alert.acknowledged
                                        ? "bg-gray-50 border-gray-200 opacity-60"
                                        : alert.severity === "critical"
                                            ? "bg-red-50 border-red-300 animate-pulse-alert"
                                            : "bg-yellow-50 border-yellow-300"
                                }`}
                            >
                                <span
                                    className={`px-2 py-0.5 rounded text-xs font-bold mt-0.5 shrink-0 ${severityStyle(
                                        alert.severity
                                    )}`}
                                >
                                    {severityLabel(alert.severity)}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-800">
                                        {alert.message}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {formatTime(alert.timestamp)}
                                        {" · "}
                                        摄像头: {alert.cameraId}
                                    </p>
                                </div>
                                {!alert.acknowledged && (
                                    <button
                                        onClick={() =>
                                            acknowledgeAlert(alert.id)
                                        }
                                        className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors shrink-0"
                                    >
                                        确认
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
