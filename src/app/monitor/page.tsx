"use client";

import { useRef, useState, useEffect } from "react";
import { detectFrame, drawBoxes } from "@/utils/detector";
import { dataSender } from "@/utils/dataSender";
import { DetectionBox } from "@/utils/types";
import StatsPanel from "@/components/StatsPanel";
import AlertPanel from "@/components/AlertPanel";

export default function MonitorPage() {
    const [running, setRunning] = useState(false);
    const [count, setCount] = useState(0);
    const [lastAlert, setLastAlert] = useState<{
        message: string;
        severity: string;
    } | null>(null);
    const camRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streaming = useRef(false);

    /** 格式化躺卧时长 */
    const formatDuration = (ms: number) => {
        if (ms < 60000) return `${Math.floor(ms / 1000)}秒`;
        return `${Math.floor(ms / 60000)}分${Math.floor((ms % 60000) / 1000)}秒`;
    };

    /** 启动摄像头检测 */
    const startMonitor = async () => {
        if (streaming.current) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 },
            });
            const cam = camRef.current!;
            cam.srcObject = stream;
            await cam.play();
            streaming.current = true;
            setRunning(true);

            const cvs = canvasRef.current!;
            const ctx = cvs.getContext("2d")!;
            cvs.width = 640;
            cvs.height = 480;

            // 配置数据发送器
            dataSender.configure({
                cameraId: "monitor-cam-1",
                intervalMs: 2000,
                onAlert: (message, severity) => {
                    setLastAlert({ message, severity });
                },
            });
            dataSender.startSending();

            async function loop() {
                if (!streaming.current) return;
                ctx.drawImage(cam, 0, 0);
                const boxes = await detectFrame(cam);
                drawBoxes(ctx, boxes);
                setCount(boxes.length);

                // 缓存检测结果，由 dataSender 定时发送
                const detectionBoxes: DetectionBox[] = boxes.map(
                    (b) => ({
                        x1: b.x1,
                        y1: b.y1,
                        x2: b.x2,
                        y2: b.y2,
                        conf: b.conf,
                        cls: b.cls,
                        className: [
                            "drinking",
                            "eating",
                            "resting",
                            "standing",
                            "walking",
                        ][b.cls] || "unknown",
                    })
                );
                dataSender.cacheDetections(
                    detectionBoxes,
                    cvs.width,
                    cvs.height,
                    "camera"
                );

                // 帧率控制：约 15fps
                setTimeout(
                    () => requestAnimationFrame(loop),
                    1000 / 15
                );
            }
            loop();
        } catch (err) {
            alert(
                "无法访问摄像头: " +
                    (err instanceof Error ? err.message : "未知错误")
            );
        }
    };

    /** 停止监控 */
    const stopMonitor = () => {
        const cam = camRef.current!;
        (cam.srcObject as MediaStream)
            ?.getTracks()
            .forEach((t) => t.stop());
        streaming.current = false;
        dataSender.stopSending();
        setRunning(false);
        setCount(0);
    };

    /** 组件卸载时清理 */
    useEffect(() => {
        return () => {
            if (streaming.current) {
                const cam = camRef.current;
                if (cam && cam.srcObject) {
                    (cam.srcObject as MediaStream)
                        .getTracks()
                        .forEach((t) => t.stop());
                }
            }
            dataSender.stopSending();
        };
    }, []);

    return (
        <main className="min-h-screen bg-gray-100">
            {/* 顶部状态栏 */}
            <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-gray-800">
                            牛只行为实时监控中心
                        </h1>
                        <span
                            className={`px-3 py-1 rounded-full text-sm font-bold ${
                                running
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-500"
                            }`}
                        >
                            {running ? "监控中" : "未启动"}
                        </span>
                        {dataSender.isSending() && (
                            <span className="px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-700">
                                数据上报中
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        {lastAlert && (
                            <span
                                className={`px-3 py-1 rounded-full text-sm font-bold animate-pulse-alert ${
                                    lastAlert.severity === "critical"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-yellow-100 text-yellow-700"
                                }`}
                            >
                                {lastAlert.message}
                            </span>
                        )}
                        <a
                            href="/"
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                        >
                            返回检测页面
                        </a>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 左侧：实时画面 */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
                                <span className="font-bold">
                                    实时检测画面
                                </span>
                                <span className="text-sm text-gray-300">
                                    检测目标: {count}
                                </span>
                            </div>
                            <div className="relative bg-black aspect-video flex items-center justify-center">
                                {!running && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-gray-400">
                                        <p>摄像头未启动</p>
                                    </div>
                                )}
                                <canvas
                                    ref={canvasRef}
                                    className="w-full h-full object-contain"
                                />
                                <video
                                    ref={camRef}
                                    className="hidden"
                                    playsInline
                                    muted
                                />
                            </div>
                            <div className="p-4 flex items-center justify-center gap-4">
                                <button
                                    onClick={startMonitor}
                                    disabled={running}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold"
                                >
                                    启动监控
                                </button>
                                <button
                                    onClick={stopMonitor}
                                    disabled={!running}
                                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold"
                                >
                                    停止监控
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 右侧面板 */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* 统计面板 */}
                        <div className="bg-white rounded-xl shadow-lg p-4">
                            <StatsPanel />
                        </div>

                        {/* 告警面板 */}
                        <div className="bg-white rounded-xl shadow-lg p-4">
                            <AlertPanel embedded />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
