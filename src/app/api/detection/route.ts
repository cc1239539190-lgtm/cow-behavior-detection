import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { anomalyDetector } from "@/lib/anomalyDetector";
import { DetectionFrame, DetectionRequest, DetectionResponse } from "@/utils/types";

/** POST: 接收检测数据 */
export async function POST(request: NextRequest) {
    try {
        const body: DetectionRequest = await request.json();

        if (!body.cameraId || !body.detections) {
            return NextResponse.json(
                { success: false, message: "缺少必要参数 cameraId 或 detections" },
                { status: 400 }
            );
        }

        const frame: DetectionFrame = {
            timestamp: Date.now(),
            source: body.source || "camera",
            detections: body.detections,
            frameWidth: body.frameWidth || 0,
            frameHeight: body.frameHeight || 0,
        };

        store.addDetection(body.cameraId, frame);

        const result = anomalyDetector.analyzeFrame(body.cameraId, frame);

        const status = anomalyDetector.getStatus(body.cameraId);

        const response: DetectionResponse = {
            success: true,
            status: result.triggered
                ? result.alert!.severity
                : status.resting
                    ? "warning"
                    : "normal",
            message: result.triggered ? result.alert!.message : undefined,
        };

        return NextResponse.json(response);
    } catch (error) {
        return NextResponse.json(
            { success: false, message: "服务器内部错误" },
            { status: 500 }
        );
    }
}

/** GET: 获取最近检测记录 */
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const cameraId = searchParams.get("cameraId") || "default";
    const limit = Math.min(
        parseInt(searchParams.get("limit") || "50", 10),
        200
    );

    const frames = store.getRecentDetections(cameraId, limit);
    const status = anomalyDetector.getStatus(cameraId);

    return NextResponse.json({
        cameraId,
        status,
        frameCount: frames.length,
        frames,
    });
}
