"use client";
import DetectionUI from "../components/DetectionUI";

export default function Home() {
  return (
    <main 
      className="
        min-h-screen 
        py-8 px-4
        bg-[url('/background.jpg')] 
        bg-cover bg-center bg-fixed bg-no-repeat
        bg-white/70
        bg-blend-overlay
      "
    >
      <h1 className="text-3xl font-bold text-center text-blue-700">
        奶牛行为智能检测系统 V1.0
      </h1>
      <p className="text-center text-gray-600 mt-2">
        支持：图片 | 视频 | 实时摄像头监控
      </p>
      <div className="text-center mt-3">
        <a
          href="/monitor"
          className="inline-block px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-bold"
        >
          实时监控中心
        </a>
      </div>
      <DetectionUI />
    </main>
  );
}