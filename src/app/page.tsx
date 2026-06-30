"use client";
import DetectionUI from "../components/DetectionUI";

export default function Home() {
    return (
        <main
            className="
                min-h-screen px-3
                bg-[url('/background.jpg')]
                bg-cover bg-center bg-fixed bg-no-repeat
                bg-white/70
                bg-blend-overlay
            "
        >
            <div className="pt-3 pb-1 text-center">
                <div className="flex items-center justify-center gap-3">
                    <h1 className="text-2xl font-bold text-blue-700">
                        奶牛行为智能检测系统 V1.1
                    </h1>
                    <a
                        href="https://github.com/cc1239539190-lgtm/cow-behavior-detection"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-gray-900 transition-colors"
                        title="GitHub 仓库"
                    >
                        <svg
                            className="w-6 h-6"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                        </svg>
                    </a>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                    支持：图片 | 视频 | 实时摄像头监控
                </p>
            </div>
            <DetectionUI />
        </main>
    );
}
