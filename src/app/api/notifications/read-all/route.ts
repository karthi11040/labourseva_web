import { NextRequest, NextResponse } from "next/server";
import { NotificationService } from "@/modules/notifications/services/notification.service";
import { resolveAuthenticatedUserId } from "@/modules/notifications/utils/auth-resolver";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/notifications/read-all
 * Marks all notifications as read for the authenticated session.
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await resolveAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized session" }, { status: 401 });
    }

    const markedCount = await NotificationService.markAllAsRead(userId);

    return NextResponse.json({ ok: true, markedCount, unreadCount: 0 });
  } catch (err: any) {
    console.error("PATCH /api/notifications/read-all error:", err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}
