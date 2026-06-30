"use client";

import { Box, getClassName } from "@/utils/detector";

const CLASS_COLORS: Record<string, string> = {
    drinking: "bg-blue-100 text-blue-700 border-blue-300",
    eating: "bg-green-100 text-green-700 border-green-300",
    resting: "bg-yellow-100 text-yellow-700 border-yellow-300",
    standing: "bg-purple-100 text-purple-700 border-purple-300",
    walking: "bg-red-100 text-red-700 border-red-300",
};

const CLASS_LABELS: Record<string, string> = {
    drinking: "饮水",
    eating: "进食",
    resting: "休息",
    standing: "站立",
    walking: "行走",
};

interface DetectionResultPanelProps {
    boxes: Box[];
    frameWidth: number;
    frameHeight: number;
}

export default function DetectionResultPanel({
    boxes,
    frameWidth,
    frameHeight,
}: DetectionResultPanelProps) {
    return (
        <div>
            <h3 className="text-base font-bold text-gray-700 mb-3">
                检测结果
                {boxes.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {boxes.length}
                    </span>
                )}
            </h3>

            {boxes.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">
                    暂无检测结果
                </p>
            ) : (
                <div className="space-y-1.5 max-h-[calc(100vh-480px)] overflow-y-auto min-h-[100px]">
                    {boxes.map((box, i) => {
                        const className = getClassName(box.cls);
                        const label = CLASS_LABELS[className] || className;
                        const colorStyle = CLASS_COLORS[className] || "bg-gray-100 border-gray-300";
                        return (
                            <div
                                key={i}
                                className={`px-2.5 py-1.5 rounded-md border text-xs ${colorStyle}`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-bold">
                                        #{i + 1} {label}
                                    </span>
                                    <span className="font-mono">
                                        {(box.conf * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="mt-1 text-gray-500 font-mono text-[10px] leading-relaxed">
                                    x₁={box.x1.toFixed(0)}{" "}
                                    y₁={box.y1.toFixed(0)}
                                    <br />
                                    x₂={box.x2.toFixed(0)}{" "}
                                    y₂={box.y2.toFixed(0)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
