/** 单个检测框 */
export interface DetectionBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    conf: number;
    cls: number;
    className: string;
}

/** 一帧检测结果 */
export interface DetectionFrame {
    timestamp: number;
    source: "image" | "video" | "camera";
    detections: DetectionBox[];
    frameWidth: number;
    frameHeight: number;
}

/** 告警记录 */
export interface AlertRecord {
    id: string;
    type: "cow_down" | "camera_offline";
    severity: "warning" | "critical";
    message: string;
    timestamp: number;
    acknowledged: boolean;
    cameraId: string;
}

/** 行为分类统计 */
export interface BehaviorStats {
    drinking: number;
    eating: number;
    resting: number;
    standing: number;
    walking: number;
}

/** 仪表盘统计 */
export interface DetectionStats {
    totalDetections: number;
    behaviorDistribution: BehaviorStats;
    activeCameras: number;
    recentFrames: DetectionFrame[];
    recentAlerts: AlertRecord[];
    alertsToday: number;
}

/** POST /api/detection 请求体 */
export interface DetectionRequest {
    cameraId: string;
    source: "image" | "video" | "camera";
    detections: DetectionBox[];
    frameWidth: number;
    frameHeight: number;
}

/** POST /api/detection 响应体 */
export interface DetectionResponse {
    success: boolean;
    status: "normal" | "warning" | "critical";
    message?: string;
}
