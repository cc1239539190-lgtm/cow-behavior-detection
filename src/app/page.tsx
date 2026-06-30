"use client";
import DetectionUI from "../components/DetectionUI";

export default function Home() {
    return (
        <main
            className="
                min-h-screen
                bg-[url('/background.jpg')]
                bg-cover bg-center bg-fixed bg-no-repeat
                bg-white/70
                bg-blend-overlay
            "
        >
            <div className="pt-3 pb-1 text-center">
                <h1 className="text-2xl font-bold text-blue-700">
                    奶牛行为智能检测系统 V1.0
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    支持：图片 | 视频 | 实时摄像头监控
                </p>
            </div>
            <DetectionUI />
        </main>
    );
}
