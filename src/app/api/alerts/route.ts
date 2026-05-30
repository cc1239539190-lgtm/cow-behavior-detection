import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { AlertRecord } from "@/utils/types";

/** GET: 获取告警列表 */
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const acknowledgedParam = searchParams.get("acknowledged");

    let acknowledged: boolean | undefined;
    if (acknowledgedParam === "true") acknowledged = true;
    else if (acknowledgedParam === "false") acknowledged = false;

    const limit = Math.min(
        parseInt(searchParams.get("limit") || "100", 10),
        500
    );

    const alerts = store.getAlerts(acknowledged).slice(0, limit);

    return NextResponse.json({
        total: alerts.length,
        alerts,
    });
}

/** POST: 手动创建告警 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const alert: AlertRecord = {
            id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            type: body.type || "cow_down",
            severity: body.severity || "warning",
            message: body.message || "手动创建的告警",
            timestamp: Date.now(),
            acknowledged: false,
            cameraId: body.cameraId || "default",
        };

        store.addAlert(alert);

        return NextResponse.json({ success: true, alert }, { status: 201 });
    } catch {
        return NextResponse.json(
            { success: false, message: "创建告警失败" },
            { status: 500 }
        );
    }
}

/** PATCH: 确认/处理告警 */
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json(
                { success: false, message: "缺少告警ID" },
                { status: 400 }
            );
        }

        const result = store.acknowledgeAlert(body.id);

        if (!result) {
            return NextResponse.json(
                { success: false, message: "未找到该告警" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, message: "告警已确认" });
    } catch {
        return NextResponse.json(
            { success: false, message: "确认告警失败" },
            { status: 500 }
        );
    }
}
