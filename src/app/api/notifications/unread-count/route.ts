import { NextRequest, NextResponse } from "next/server";
import { NotificationService } from "@/modules/notifications/services/notification.service";
import { resolveAuthenticatedUserId } from "@/modules/notifications/utils/auth-resolver";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications/unread-count
 * Returns lightweight unread count for the notification badge.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await resolveAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ ok: false, unreadCount: 0 }, { status: 401 });
    }

    const unreadCount = await NotificationService.getUnreadCount(userId);

    return NextResponse.json({ ok: true, unreadCount });
  } catch (err: any) {
    console.error("GET /api/notifications/unread-count error:", err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || "Internal error", unreadCount: 0 }, { status: 500 });
  }
}
