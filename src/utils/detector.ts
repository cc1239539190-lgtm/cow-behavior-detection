import * as ort from "onnxruntime-web";

// ============================= 配置项 ====================================
const CLASS_NAMES = ["drinking", "eating", "resting", "standing", "walking"];
const IOU_THRESHOLD = 0.45;
const MODEL_SIZE = 640;

/** 预置模型列表 */
const BUILT_IN_MODELS: ModelEntry[] = [
    { name: "YOLOv11 默认模型", path: "/best.onnx", builtIn: true },
];

export interface ModelEntry {
    name: string;
    path: string;
    builtIn?: boolean;
}

/** 缓存的模型会话 */
const sessionCache = new Map<string, ort.InferenceSession>();

/** 当前置信度阈值（运行时可变） */
let currentConfThreshold = 0.15;

/** 用户自定义模型列表（持久化到 localStorage） */
const STORAGE_KEY = "cow_detection_models";

function loadCustomModels(): ModelEntry[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            return JSON.parse(raw) as ModelEntry[];
        }
    } catch {
        // ignore
    }
    return [];
}

function saveCustomModels(models: ModelEntry[]): void {
    try {
        const custom = models.filter((m) => !m.builtIn);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
    } catch {
        // ignore
    }
}

/** 获取所有可用模型 */
export function getAvailableModels(): ModelEntry[] {
    return [...BUILT_IN_MODELS, ...loadCustomModels()];
}

/** 添加自定义模型 */
export function addModel(name: string, path: string): void {
    const custom = loadCustomModels();
    // 去重
    if (
        custom.some((m) => m.path === path) ||
        BUILT_IN_MODELS.some((m) => m.path === path)
    ) {
        return;
    }
    custom.push({ name, path });
    saveCustomModels(custom);
    // 清除旧 session 缓存
    sessionCache.delete(path);
}

/** 移除模型 */
export function removeModel(path: string): void {
    const custom = loadCustomModels().filter((m) => m.path !== path);
    saveCustomModels(custom);
    sessionCache.delete(path);
}

/** 设置置信度阈值 */
export function setConfidenceThreshold(value: number): void {
    currentConfThreshold = Math.max(0.01, Math.min(0.99, value));
}

/** 获取当前置信度阈值 */
export function getConfidenceThreshold(): number {
    return currentConfThreshold;
}

/** 加载模型（支持多模型缓存） */
export async function loadModel(
    modelPath = "/best.onnx"
): Promise<ort.InferenceSession> {
    let session = sessionCache.get(modelPath);
    if (!session) {
        session = await ort.InferenceSession.create(modelPath);
        sessionCache.set(modelPath, session);
    }
    return session;
}

// 图像预处理
export function preprocess(
    img: CanvasImageSource,
    targetSize = MODEL_SIZE
) {
    const canvas = document.createElement("canvas");
    const imgW =
        (img as HTMLImageElement).width ||
        (img as HTMLVideoElement).videoWidth;
    const imgH =
        (img as HTMLImageElement).height ||
        (img as HTMLVideoElement).videoHeight;
    const scale = targetSize / Math.max(imgW, imgH);
    const w = Math.round(imgW * scale);
    const h = Math.round(imgH * scale);

    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, targetSize, targetSize);
    ctx.drawImage(
        img,
        (targetSize - w) / 2,
        (targetSize - h) / 2,
        w,
        h
    );

    const data = ctx.getImageData(0, 0, targetSize, targetSize).data;
    const input = new Float32Array(3 * targetSize * targetSize);
    const offset1 = targetSize * targetSize;
    const offset2 = 2 * targetSize * targetSize;
    for (let i = 0; i < targetSize * targetSize; i++) {
        input[i] = data[i * 4] / 255;
        input[i + offset1] = data[i * 4 + 1] / 255;
        input[i + offset2] = data[i * 4 + 2] / 255;
    }
    return {
        input,
        scale,
        ox: (targetSize - w) / 2,
        oy: (targetSize - h) / 2,
        w,
        h,
    };
}

// IOU计算
function computeIOU(a: Box, b: Box) {
    const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
    const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
    const inter =
        Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)) *
        Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
    return inter / (areaA + areaB - inter);
}

export interface Box {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    conf: number;
    cls: number;
}

// NMS非极大值抑制
function nms(boxes: Box[]): Box[] {
    const filtered = boxes.filter(
        (b) => b.conf >= currentConfThreshold
    );
    const result: Box[] = [];
    filtered.forEach((box) => {
        let keep = true;
        result.forEach((r) => {
            if (computeIOU(box, r) > IOU_THRESHOLD) keep = false;
        });
        if (keep) result.push(box);
    });
    return result;
}

/** 统一检测函数（图片/视频帧/摄像头帧通用） */
export async function detectFrame(
    img: CanvasImageSource,
    modelPath?: string
): Promise<Box[]> {
    const model = await loadModel(modelPath);
    const { input, scale, ox, oy } = preprocess(img);
    const tensor = new ort.Tensor("float32", input, [
        1,
        3,
        MODEL_SIZE,
        MODEL_SIZE,
    ]);
    const output = await model.run({ images: tensor });

    const data = output.output0.data;
    const boxes: Box[] = [];
    const numClass = CLASS_NAMES.length;
    const threshold = currentConfThreshold;

    for (let i = 0; i < 8400; i++) {
        const x = Number(data[i]);
        const y = Number(data[i + 8400]);
        const w = Number(data[i + 16800]);
        const h = Number(data[i + 25200]);
        const conf = Number(data[i + 33600]);

        let maxScore = 0;
        let clsId = 0;
        for (let c = 0; c < numClass; c++) {
            const score = Number(data[i + (5 + c) * 8400]);
            if (score > maxScore) {
                maxScore = score;
                clsId = c;
            }
        }

        if (maxScore > threshold) {
            boxes.push({
                x1: (x - w / 2 - ox) / scale,
                y1: (y - h / 2 - oy) / scale,
                x2: (x + w / 2 - ox) / scale,
                y2: (y + h / 2 - oy) / scale,
                conf: maxScore,
                cls: clsId,
            });
        }
    }
    return nms(boxes);
}

/** 获取类别名称 */
export function getClassName(cls: number): string {
    return CLASS_NAMES[cls] || "unknown";
}

/** 获取所有类别名称 */
export function getClassNames(): string[] {
    return [...CLASS_NAMES];
}

// 绘制YOLO检测框
export function drawBoxes(
    ctx: CanvasRenderingContext2D,
    boxes: Box[]
) {
    boxes.forEach((box) => {
        const label = CLASS_NAMES[box.cls];
        const score = (box.conf * 100).toFixed(1);
        const text = `${label} ${score}%`;

        // 画框
        ctx.strokeStyle = "#00FF00";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(
            box.x1,
            box.y1,
            box.x2 - box.x1,
            box.y2 - box.y1
        );

        // 画标签背景
        ctx.fillStyle = "#00FF00";
        const tw = ctx.measureText(text).width;
        ctx.fillRect(box.x1, box.y1 - 22, tw + 8, 20);

        // 画文字
        ctx.fillStyle = "#000";
        ctx.font = "14px Arial bold";
        ctx.fillText(text, box.x1 + 4, box.y1 - 5);
    });
}
