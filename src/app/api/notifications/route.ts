import { NextRequest, NextResponse } from "next/server";
import { NotificationService } from "@/modules/notifications/services/notification.service";
import { resolveAuthenticatedUserId } from "@/modules/notifications/utils/auth-resolver";
import { NotificationDeliveryService } from "@/modules/notifications/services/notification-delivery.service";
import { NotificationFilter } from "@/modules/notifications/types/notification.types";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications
 * Retrieves notifications for the authenticated session with pagination and unread count.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await resolveAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized session", notifications: [], unreadCount: 0, totalCount: 0 },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const filter = (searchParams.get("filter")?.toUpperCase() as NotificationFilter) || "ALL";
    const category = searchParams.get("category") || undefined;

    const result = await NotificationService.getNotifications({
      userId,
      page,
      limit,
      filter,
      category,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("GET /api/notifications error:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error", notifications: [], unreadCount: 0 },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Creates a notification (system / background triggers)
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await resolveAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const targetUserId = body.recipientUserId || userId;

    const deliveryRes = await NotificationDeliveryService.deliver({
      recipientUserId: String(targetUserId),
      templateKey: body.templateKey || "SYSTEM",
      category: body.category || "SYSTEM",
      eventKey: body.eventKey,
      relatedEntityType: body.relatedEntityType,
      relatedEntityId: body.relatedEntityId,
      title: body.title || "Notification",
      message: body.message || body.body || "",
      link: body.link,
      channels: body.channels || ["INAPP"],
      language: body.language || "EN",
      phone: body.phone,
      email: body.email,
      payload: body.payload || {},
    });

    return NextResponse.json({ ok: true, delivery: deliveryRes });
  } catch (err: any) {
    console.error("POST /api/notifications error:", err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications
 * Backwards-compatible endpoint for marking all or selected as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await resolveAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { ids, markAll } = body as { ids?: string[]; markAll?: boolean };

    if (markAll) {
      const count = await NotificationService.markAllAsRead(userId);
      return NextResponse.json({ ok: true, markedCount: count });
    }

    if (ids && Array.isArray(ids) && ids.length > 0) {
      let markedCount = 0;
      for (const id of ids) {
        const ok = await NotificationService.markAsRead(id, userId);
        if (ok) markedCount++;
      }
      return NextResponse.json({ ok: true, markedCount });
    }

    return NextResponse.json({ ok: false, error: "ids array or markAll is required" }, { status: 400 });
  } catch (err: any) {
    console.error("PATCH /api/notifications error:", err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}
