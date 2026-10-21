import { NextRequest, NextResponse } from "next/server";
import { NotificationService } from "@/modules/notifications/services/notification.service";
import { resolveAuthenticatedUserId } from "@/modules/notifications/utils/auth-resolver";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/notifications/[id]
 * Marks a specific notification as read.
 * Strict authorization: Only the owner of the notification can mark it as read.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await resolveAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized session" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ ok: false, error: "Notification ID is required" }, { status: 400 });
    }

    const updated = await NotificationService.markAsRead(id, userId);

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "Notification not found or already read" },
        { status: 404 }
      );
    }

    const unreadCount = await NotificationService.getUnreadCount(userId);

    return NextResponse.json({ ok: true, unreadCount });
  } catch (err: any) {
    console.error("PATCH /api/notifications/[id] error:", err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}
