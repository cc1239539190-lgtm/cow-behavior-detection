"use client";
import { useRef, useState } from "react";
import { detectFrame, drawBoxes } from "@/utils/detector";

export default function DetectionUI() {
  const [tab, setTab] = useState<"img" | "video" | "cam">("img");
  const [count, setCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camRef = useRef<HTMLVideoElement>(null);
  const streaming = useRef(false);

  // 图片检测
  const uploadImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    imgRef.current!.src = URL.createObjectURL(f);
  };

  const runImgDetect = async () => {
    const img = imgRef.current!;
    const cvs = canvasRef.current!;
    const ctx = cvs.getContext("2d")!;
    cvs.width = img.naturalWidth;
    cvs.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    const boxes = await detectFrame(img);
    drawBoxes(ctx, boxes);
    setCount(boxes.length);
  };

  // 视频检测
  const uploadVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    videoRef.current!.src = URL.createObjectURL(f);
  };

  const runVideoDetect = () => {
    const v = videoRef.current!;
    const cvs = canvasRef.current!;
    const ctx = cvs.getContext("2d")!;
    cvs.width = v.videoWidth;
    cvs.height = v.videoHeight;

    async function loop() {
      if (v.paused) return;
      ctx.drawImage(v, 0, 0);
      const boxes = await detectFrame(v);
      drawBoxes(ctx, boxes);
      setCount(boxes.length);
      requestAnimationFrame(loop);
    }
    v.play();
    loop();
  };

  // 摄像头检测
  const startCam = async () => {
    if (streaming.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const cam = camRef.current!;
    cam.srcObject = stream;
    cam.play();
    streaming.current = true;

    const cvs = canvasRef.current!;
    const ctx = cvs.getContext("2d")!;
    cvs.width = 640;
    cvs.height = 480;

    async function loop() {
      if (!streaming.current) return;
      ctx.drawImage(cam, 0, 0);
      const boxes = await detectFrame(cam);
      drawBoxes(ctx, boxes);
      setCount(boxes.length);
      requestAnimationFrame(loop);
    }
    loop();
  };

  const stopCam = () => {
    const cam = camRef.current!;
    (cam.srcObject as MediaStream)?.getTracks().forEach(t => t.stop());
    streaming.current = false;
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-transparent min-h-screen">
      {/* 选项卡导航 */}
      <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={() => setTab("img")}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-sm ${
            tab === "img"
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          图片检测
        </button>
        <button
          onClick={() => setTab("video")}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-sm ${
            tab === "video"
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          视频检测
        </button>
        <button
          onClick={() => setTab("cam")}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-sm ${
            tab === "cam"
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          实时摄像头
        </button>
      </div>

      {/* 检测计数卡片 */}
      <div className="flex justify-center mb-6">
        <div className="bg-white/70 rounded-lg px-6 py-3 shadow-sm border border-gray-100">
          <span className="text-gray-600 font-medium">检测目标数量：</span>
          <span className="text-2xl font-bold text-red-600 ml-2">{count}</span>
        </div>
      </div>

      {/* 画布/播放器区域 */}
      <div className="bg-black rounded-xl shadow-lg overflow-hidden mb-8 border border-gray-200">
        <canvas ref={canvasRef} className="w-full h-auto max-h-[500px] object-contain" />
      </div>

      {/* 控制区卡片 */}
      <div className="bg-white/50 rounded-xl p-6 shadow-sm border border-gray-100">
        {/* 图片检测面板 */}
        {tab === "img" && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <input
              type="file"
              accept="image/*"
              ref={fileRef}
              onChange={uploadImg}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors border border-gray-200"
            >
              选择图片文件
            </label>
            <img ref={imgRef} className="hidden" />
            <button
              onClick={runImgDetect}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              开始检测
            </button>
          </div>
        )}

        {/* 视频检测面板 */}
        {tab === "video" && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <input
              type="file"
              accept="video/*"
              onChange={uploadVideo}
              className="hidden"
              id="video-upload"
            />
            <label
              htmlFor="video-upload"
              className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors border border-gray-200"
            >
              选择视频文件
            </label>
            <video ref={videoRef} className="hidden" />
            <button
              onClick={runVideoDetect}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              播放并检测
            </button>
          </div>
        )}

        {/* 摄像头检测面板 */}
        {tab === "cam" && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={startCam}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              打开摄像头
            </button>
            <button
              onClick={stopCam}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
            >
              关闭摄像头
            </button>
            <video ref={camRef} className="hidden" />
          </div>
        )}
      </div>
    </div>
  );
}