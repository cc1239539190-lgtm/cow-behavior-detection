import * as ort from "onnxruntime-web";

// ============================= 配置项 ====================================
const CLASS_NAMES = ['drinking', 'eating', 'resting', 'standing', 'walking']; // 单类别：牛（如需姿态改为 ["standing","walking"]）
const CONF_THRESHOLD = 0.15;
const IOU_THRESHOLD = 0.45;
const MODEL_SIZE = 640;
// ========================================================================

let session: ort.InferenceSession | null = null;

// 加载模型
export async function loadModel() {
  if (!session) session = await ort.InferenceSession.create("/best.onnx");
  return session;
}

// 图像预处理
export function preprocess(img: CanvasImageSource, targetSize = MODEL_SIZE) {
  const canvas = document.createElement("canvas");
  const scale = targetSize / Math.max((img as HTMLImageElement).width || (img as HTMLVideoElement).videoWidth, 
                                      (img as HTMLImageElement).height || (img as HTMLVideoElement).videoHeight);
  const w = Math.round(((img as HTMLImageElement).width || (img as HTMLVideoElement).videoWidth) * scale);
  const h = Math.round(((img as HTMLImageElement).height || (img as HTMLVideoElement).videoHeight) * scale);

  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, targetSize, targetSize);
  ctx.drawImage(img, (targetSize - w) / 2, (targetSize - h) / 2, w, h);

  const data = ctx.getImageData(0, 0, targetSize, targetSize).data;
  const input = new Float32Array(3 * targetSize * targetSize);
  for (let i = 0; i < targetSize * targetSize; i++) {
    input[i] = data[i * 4] / 255;
    input[i + targetSize * targetSize] = data[i * 4 + 1] / 255;
    input[i + 2 * targetSize * targetSize] = data[i * 4 + 2] / 255;
  }
  return { input, scale, ox: (targetSize - w) / 2, oy: (targetSize - h) / 2, w, h };
}

// IOU计算 + NMS非极大值抑制
function computeIOU(a: any, b: any) {
  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
  const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
  const inter = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)) *
                Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  return inter / (areaA + areaB - inter);
}

function nms(boxes: any[]) {
  const filtered = boxes.filter(b => b.conf >= CONF_THRESHOLD);
  const result: any[] = [];
  filtered.forEach(box => {
    let keep = true;
    result.forEach(r => { if (computeIOU(box, r) > IOU_THRESHOLD) keep = false; });
    if (keep) result.push(box);
  });
  return result;
}

// 统一检测函数（图片/视频帧/摄像头帧通用）
export async function detectFrame(img: CanvasImageSource) {
  const model = await loadModel();
  const { input, scale, ox, oy } = preprocess(img);
  const tensor = new ort.Tensor("float32", input, [1, 3, MODEL_SIZE, MODEL_SIZE]);
  const output = await model.run({ images: tensor });

  const data = output.output0.data;
  const boxes: any[] = [];
  const numClass = CLASS_NAMES.length;

  for (let i = 0; i < 8400; i++) {
    const x = Number(data[i]);
    const y = Number(data[i + 8400]);
    const w = Number(data[i + 16800]);
    const h = Number(data[i + 25200]);
    const conf = Number(data[i + 33600]);

    let maxScore = 0, clsId = 0;
    for (let c = 0; c < numClass; c++) {
      const score = Number(data[i + (5 + c) * 8400]);
      if (score > maxScore) { maxScore = score; clsId = c; }
    }

    if (maxScore > CONF_THRESHOLD) {
      boxes.push({
        x1: (x - w / 2 - ox) / scale,
        y1: (y - h / 2 - oy) / scale,
        x2: (x + w / 2 - ox) / scale,
        y2: (y + h / 2 - oy) / scale,
        conf: maxScore,
        cls: clsId
      });
    }
  }
  return nms(boxes);
}

// 绘制YOLO检测框
export function drawBoxes(ctx: CanvasRenderingContext2D, boxes: any[]) {
  boxes.forEach(box => {
    const label = CLASS_NAMES[box.cls];
    const score = (box.conf * 100).toFixed(1);
    const text = `${label} ${score}%`;

    // 画框
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1);

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