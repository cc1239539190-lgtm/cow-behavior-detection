"use client";

import { useState, useEffect } from "react";
import {
    getAvailableModels,
    addModel,
    removeModel,
    setConfidenceThreshold,
    getConfidenceThreshold,
    ModelEntry,
} from "@/utils/detector";

interface ModelSettingsProps {
    selectedModelPath: string;
    onModelChange: (path: string) => void;
}

export default function ModelSettings({
    selectedModelPath,
    onModelChange,
}: ModelSettingsProps) {
    const [models, setModels] = useState<ModelEntry[]>([]);
    const [confidence, setConfidence] = useState(getConfidenceThreshold());
    const [showDropdown, setShowDropdown] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState("");
    const [newPath, setNewPath] = useState("");

    // 加载模型列表
    const refreshModels = () => {
        setModels(getAvailableModels());
    };

    useEffect(() => {
        refreshModels();
    }, []);

    // 置信度变更
    const handleConfidenceChange = (value: number) => {
        setConfidence(value);
        setConfidenceThreshold(value);
    };

    // 当前选中模型名称
    const selectedModel = models.find(
        (m) => m.path === selectedModelPath
    );

    // 添加模型
    const handleAddModel = () => {
        const name = newName.trim();
        const path = newPath.trim();
        if (!name || !path) return;
        addModel(name, path);
        refreshModels();
        setNewName("");
        setNewPath("");
        setShowAddForm(false);
    };

    // 删除模型
    const handleRemoveModel = (path: string) => {
        removeModel(path);
        refreshModels();
        // 如果删除的是当前选中模型，切回默认
        if (path === selectedModelPath) {
            onModelChange("/best.onnx");
        }
    };

    return (
        <div>
            <h3 className="text-base font-bold text-gray-700 mb-3">
                模型 / 参数设置
            </h3>

            {/* 模型选择 */}
            <div className="mb-4">
                <label className="text-xs text-gray-500 mb-1 block">
                    检测模型
                </label>
                <div className="relative">
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-left flex items-center justify-between hover:border-blue-400 transition-colors"
                    >
                        <span className="truncate">
                            {selectedModel
                                ? selectedModel.name
                                : "选择模型"}
                        </span>
                        <svg
                            className={`w-4 h-4 transition-transform ${
                                showDropdown ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </button>

                    {showDropdown && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {models.map((m) => (
                                <div
                                    key={m.path}
                                    className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                                    onClick={() => {
                                        onModelChange(m.path);
                                        setShowDropdown(false);
                                    }}
                                >
                                    <span
                                        className={
                                            m.path ===
                                            selectedModelPath
                                                ? "text-blue-600 font-bold"
                                                : "text-gray-700"
                                        }
                                    >
                                        {m.name}
                                    </span>
                                    {!m.builtIn && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveModel(
                                                    m.path
                                                );
                                            }}
                                            className="text-red-400 hover:text-red-600 text-xs"
                                        >
                                            删除
                                        </button>
                                    )}
                                </div>
                            ))}

                            {/* 添加按钮 */}
                            <div className="border-t border-gray-100">
                                {showAddForm ? (
                                    <div className="p-2 space-y-2">
                                        <input
                                            type="text"
                                            placeholder="模型名称"
                                            value={newName}
                                            onChange={(e) =>
                                                setNewName(
                                                    e.target
                                                        .value
                                                )
                                            }
                                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                        />
                                        <input
                                            type="text"
                                            placeholder="模型路径 (如 /model.onnx)"
                                            value={newPath}
                                            onChange={(e) =>
                                                setNewPath(
                                                    e.target
                                                        .value
                                                )
                                            }
                                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={
                                                    handleAddModel
                                                }
                                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                            >
                                                确认
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setShowAddForm(
                                                        false
                                                    )
                                                }
                                                className="px-3 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                                            >
                                                取消
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() =>
                                            setShowAddForm(true)
                                        }
                                        className="w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-1"
                                    >
                                        + 添加模型
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 置信度阈值 */}
            <div>
                <label className="text-xs text-gray-500 mb-1 block">
                    置信度阈值:{" "}
                    <span className="font-bold text-blue-600">
                        {confidence.toFixed(2)}
                    </span>
                </label>
                <input
                    type="range"
                    min="0.05"
                    max="0.95"
                    step="0.05"
                    value={confidence}
                    onChange={(e) =>
                        handleConfidenceChange(
                            parseFloat(e.target.value)
                        )
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                    <span>0.05</span>
                    <span>0.95</span>
                </div>
            </div>
        </div>
    );
}
