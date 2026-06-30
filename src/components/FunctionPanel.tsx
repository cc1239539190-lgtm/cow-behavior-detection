"use client";

interface FunctionPanelProps {
    activeTab: "img" | "video" | "cam";
    onTabChange: (tab: "img" | "video" | "cam") => void;
    onStart: () => void;
    onStop: () => void;
    isRunning: boolean;
    hasInput: boolean;
}

export default function FunctionPanel({
    activeTab,
    onTabChange,
    onStart,
    onStop,
    isRunning,
    hasInput,
}: FunctionPanelProps) {
    return (
        <div>
            <h3 className="text-base font-bold text-gray-700 mb-3">
                功能
            </h3>

            {/* 模式选择 */}
            <div className="flex flex-col gap-1.5 mb-3">
                <label className="text-xs text-gray-500">检测模式</label>
                <div className="flex gap-1">
                    {([
                        ["img", "图片"],
                        ["video", "视频"],
                        ["cam", "摄像头"],
                    ] as const).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() =>
                                onTabChange(
                                    key as "img" | "video" | "cam"
                                )
                            }
                            className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-colors ${
                                activeTab === key
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col gap-2">
                <button
                    onClick={onStart}
                    disabled={isRunning || !hasInput}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-bold"
                >
                    {isRunning ? "检测中..." : "开始检测"}
                </button>

                {isRunning && (
                    <button
                        onClick={onStop}
                        className="w-full py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-bold"
                    >
                        停止检测
                    </button>
                )}

                <a
                    href="/monitor"
                    className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-bold text-center block"
                >
                    进入实时监控中心
                </a>
            </div>
        </div>
    );
}
