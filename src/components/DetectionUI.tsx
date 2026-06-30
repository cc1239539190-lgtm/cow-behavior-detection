"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import {
    detectFrame,
    drawBoxes,
    Box,
} from "@/utils/detector";
import { dataSender } from "@/utils/dataSender";
import { DetectionBox } from "@/utils/types";
import ModelSettings from "./ModelSettings";
import FunctionPanel from "./FunctionPanel";
import DetectionResultPanel from "./DetectionResultPanel";

const CLASS_NAMES = [
    "drinking",
    "eating",
    "resting",
    "standing",
    "walking",
];

function toDetectionBoxes(
    boxes: Box[],
    canvasWidth: number,
    canvasHeight: number
): DetectionBox[] {
    return boxes.map((b) => ({
        x1: b.x1,
        y1: b.y1,
        x2: b.x2,
        y2: b.y2,
        conf: b.conf,
        cls: b.cls,
        className: CLASS_NAMES[b.cls] || "unknown",
    }));
}

export default function DetectionUI() {
    const [tab, setTab] = useState<"img" | "video" | "cam">("img");
    const [boxes, setBoxes] = useState<Box[]>([]);
    const [sending, setSending] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [hasInput, setHasInput] = useState(false);
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] =
        useState("/best.onnx");
    const [frameSize, setFrameSize] = useState({
        width: 640,
        height: 480,
    });

    const fileRef = useRef<HTMLInputElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const camRef = useRef<HTMLVideoElement>(null);
    const streaming = useRef(false);
    const animFrameRef = useRef(0);

    // 组件卸载清理
    useEffect(() => {
        return () => {
            if (animFrameRef.current)
                cancelAnimationFrame(animFrameRef.current);
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

    // ---- 图片检测 ----
    const uploadImg = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const url = URL.createObjectURL(f);
        setImgSrc(url);
        setHasInput(true);
        setBoxes([]);
    };

    const runImgDetect = useCallback(async () => {
        if (!imgSrc) return;
        // 等图片加载
        const img = new Image();
        img.src = imgSrc;
        await new Promise<void>((resolve) => {
            if (img.complete) resolve();
            else img.onload = () => resolve();
        });

        const cvs = canvasRef.current!;
        const ctx = cvs.getContext("2d")!;
        cvs.width = img.naturalWidth;
        cvs.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        const result = await detectFrame(img, selectedModel);
        drawBoxes(ctx, result);
        setBoxes(result);
        setFrameSize({ width: img.naturalWidth, height: img.naturalHeight });
    }, [imgSrc, selectedModel]);

    // ---- 视频检测 ----
    const uploadVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const url = URL.createObjectURL(f);
        setVideoSrc(url);
        setHasInput(true);
        setBoxes([]);
    };

    const runVideoDetect = useCallback(() => {
        const v = videoRef.current!;
        if (!v.src) return;
        const cvs = canvasRef.current!;
        const ctx = cvs.getContext("2d")!;
        cvs.width = v.videoWidth;
        cvs.height = v.videoHeight;

        dataSender.configure({
            cameraId: "video-detection",
            intervalMs: 2000,
        });
        dataSender.startSending();
        setSending(true);
        setIsRunning(true);

        async function loop() {
            if (v.paused) {
                dataSender.stopSending();
                setSending(false);
                setIsRunning(false);
                return;
            }
            ctx.drawImage(v, 0, 0);
            const result = await detectFrame(v, selectedModel);
            drawBoxes(ctx, result);
            setBoxes(result);
            setFrameSize({ width: cvs.width, height: cvs.height });
            dataSender.cacheDetections(
                toDetectionBoxes(result, cvs.width, cvs.height),
                cvs.width,
                cvs.height,
                "video"
            );
            animFrameRef.current = requestAnimationFrame(loop);
        }
        v.play();
        loop();
    }, [selectedModel]);

    // ---- 摄像头检测 ----
    const startCam = useCallback(async () => {
        if (streaming.current) return;
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
        });
        const cam = camRef.current!;
        cam.srcObject = stream;
        await cam.play();
        streaming.current = true;
        setIsRunning(true);
        setHasInput(true);

        const cvs = canvasRef.current!;
        const ctx = cvs.getContext("2d")!;
        cvs.width = 640;
        cvs.height = 480;

        dataSender.configure({
            cameraId: "live-camera",
            intervalMs: 2000,
        });
        dataSender.startSending();
        setSending(true);

        async function loop() {
            if (!streaming.current) return;
            ctx.drawImage(cam, 0, 0);
            const result = await detectFrame(cam, selectedModel);
            drawBoxes(ctx, result);
            setBoxes(result);
            setFrameSize({ width: cvs.width, height: cvs.height });
            dataSender.cacheDetections(
                toDetectionBoxes(result, cvs.width, cvs.height),
                cvs.width,
                cvs.height,
                "camera"
            );
            animFrameRef.current = requestAnimationFrame(loop);
        }
        loop();
    }, [selectedModel]);

    const stopCam = useCallback(() => {
        const cam = camRef.current!;
        (cam.srcObject as MediaStream)
            ?.getTracks()
            .forEach((t) => t.stop());
        streaming.current = false;
        dataSender.stopSending();
        setSending(false);
        setIsRunning(false);
        setBoxes([]);
    }, []);

    // 开始/停止
    const handleStart = () => {
        if (tab === "img") runImgDetect();
        else if (tab === "video") runVideoDetect();
        else if (tab === "cam") startCam();
    };

    const handleStop = () => {
        if (tab === "cam") stopCam();
        else if (tab === "video") {
            videoRef.current?.pause();
            dataSender.stopSending();
            setSending(false);
            setIsRunning(false);
        }
    };

    // 切换 tab 时重置
    const handleTabChange = (newTab: "img" | "video" | "cam") => {
        if (isRunning) handleStop();
        setTab(newTab);
        setBoxes([]);
        setHasInput(false);
        setImgSrc(null);
        setVideoSrc(null);
    };

    // ---- 渲染原始图像区域 ----
    const renderSourcePanel = () => {
        // 摄像头模式
        if (tab === "cam") {
            return (
                <video
                    ref={camRef}
                    className="w-full h-full object-contain"
                    playsInline
                    muted
                />
            );
        }

        // 视频模式
        if (tab === "video") {
            if (!hasInput) {
                return (
                    <div className="text-gray-500 text-sm text-center">
                        <p className="mb-3">请先选择视频文件</p>
                        <label
                            htmlFor="video-upload"
                            className="inline-block px-4 py-1.5 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 text-xs"
                        >
                            选择视频
                        </label>
                        <input
                            id="video-upload"
                            type="file"
                            accept="video/*"
                            onChange={uploadVideo}
                            className="hidden"
                        />
                    </div>
                );
            }
            return (
                <video
                    ref={videoRef}
                    src={videoSrc ?? undefined}
                    className="w-full h-full object-contain"
                    playsInline
                />
            );
        }

        // 图片模式
        if (!hasInput) {
            return (
                <div className="text-gray-500 text-sm text-center">
                    <p className="mb-3">请先选择图片文件</p>
                    <label
                        htmlFor="file-upload"
                        className="inline-block px-4 py-1.5 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 text-xs"
                    >
                        选择图片
                    </label>
                    <input
                        id="file-upload"
                        type="file"
                        accept="image/*"
                        ref={fileRef}
                        onChange={uploadImg}
                        className="hidden"
                    />
                </div>
            );
        }
        return (
            <img
                ref={imgRef}
                src={imgSrc ?? undefined}
                className="max-w-full max-h-full object-contain"
                alt="检测源图"
            />
        );
    };

    const showCanvas = isRunning || (tab === "img" && boxes.length > 0);

    return (
        <div className="min-h-screen">
            <div className="grid grid-cols-[2fr_1fr] gap-3 h-full">
                {/* ============ 左侧: 原始图像 + 检测结果 ============ */}
                <div className="flex flex-col gap-1.5">
                    {/* 上: 原始图像 */}
                    <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                            <h3 className="text-sm font-bold text-gray-700">
                                原始图像
                            </h3>
                        </div>
                        <div className="flex-1 bg-black flex items-center justify-center min-h-[250px]">
                            {renderSourcePanel()}
                        </div>
                    </div>

                    {/* 下: 检测结果 Canvas */}
                    <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-700">
                                检测结果
                            </h3>
                            <div className="flex items-center gap-2">
                                {sending && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full animate-pulse-alert">
                                        数据上报中
                                    </span>
                                )}
                                <span className="text-xs text-gray-400">
                                    检测目标: {boxes.length}
                                </span>
                            </div>
                        </div>
                        <div className="flex-1 bg-[#1a1a1a] flex items-center justify-center min-h-[250px]">
                            {showCanvas ? (
                                <canvas
                                    ref={canvasRef}
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <p className="text-gray-500 text-sm">
                                    选择文件并开始检测
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ============ 右侧: 功能栏 ============ */}
                <div className="flex flex-col gap-0">
                    {/* 模型/参数设置 */}
                    <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-4 overflow-y-auto">
                        <ModelSettings
                            selectedModelPath={selectedModel}
                            onModelChange={setSelectedModel}
                        />
                    </div>

                    {/* 功能 */}
                    <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col justify-center">
                        <FunctionPanel
                            activeTab={tab}
                            onTabChange={handleTabChange}
                            onStart={handleStart}
                            onStop={handleStop}
                            isRunning={isRunning}
                            hasInput={hasInput || tab === "cam"}
                        />
                    </div>

                    {/* 检测结果文字输出 */}
                    <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-4 overflow-y-auto">
                        <DetectionResultPanel
                            boxes={boxes}
                            frameWidth={frameSize.width}
                            frameHeight={frameSize.height}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
