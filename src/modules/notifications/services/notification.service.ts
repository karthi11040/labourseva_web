/**
 * LabourSeva — Notification Service
 * Primary application facade for querying, reading, and managing user notifications.
 */
import { NotificationRepository } from "../repositories/notification.repository";
import {
  InAppNotificationItem,
  NotificationListResponse,
  NotificationQueryParams,
} from "../types/notification.types";
import { prisma } from "@/lib/prisma";

export class NotificationService {
  /**
   * One-time lazy seed from user's legacy activity if user has 0 notifications.
   * Guarantees only one check per user.
   */
  private static async lazySeedLegacyActivity(userId: string): Promise<void> {
    try {
      const count = await NotificationRepository.countUnread(userId);
      if (count > 0) return;

      const totalRows = await prisma.$queryRawUnsafe<any[]>(
        "SELECT COUNT(*) as cnt FROM `notifications` WHERE `userId` = ? LIMIT 1",
        userId
      ).catch(() => [{ cnt: 0 }]);

      if (Number(totalRows[0]?.cnt || 0) > 0) return;

      // Seed 2 initial contextual notifications if this user has recent service requests
      const recent = await prisma.$queryRawUnsafe<any[]>(`
        SELECT sr.id, sr.status, sr.amount, s.name as service_name
        FROM service_requests sr
        LEFT JOIN services s ON sr.service_id = s.id
        ORDER BY sr.id DESC
        LIMIT 2
      `).catch(() => []);

      for (const sr of recent) {
        const sName = sr.service_name || "Statutory Scheme";
        await NotificationRepository.createNotificationRecord({
          userId,
          channel: "INAPP",
          templateKey: "APPLICATION_SUBMITTED",
          eventKey: `legacy_seed_sr_${sr.id}_${userId}`,
          relatedEntityType: "SERVICE_REQUEST",
          relatedEntityId: String(sr.id),
          title: "Application Submitted Successfully",
          body: `Your application DOC-${sr.id} for "${sName}" is recorded in LabourSeva.`,
          payload: {
            applicationId: `DOC-${sr.id}`,
            link: "/user/applications",
          },
        }).catch(() => {});
      }
    } catch {
      // Non-blocking legacy seed
    }
  }

  /**
   * Retrieve paginated notifications with unread count
   */
  static async getNotifications(params: NotificationQueryParams): Promise<NotificationListResponse> {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.min(50, Math.max(1, Number(params.limit || 15)));

    // Run one-time lazy seed if empty
    await this.lazySeedLegacyActivity(params.userId);

    const { notifications, totalCount, unreadCount } =
      await NotificationRepository.findUserNotifications({
        ...params,
        page,
        limit,
      });

    const hasMore = page * limit < totalCount;

    return {
      ok: true,
      notifications,
      unreadCount,
      totalCount,
      hasMore,
      page,
      limit,
    };
  }

  /**
   * Return lightweight unread count for the bell badge
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return NotificationRepository.countUnread(userId);
  }

  /**
   * Mark a single notification as read for authenticated user
   */
  static async markAsRead(id: string, userId: string): Promise<boolean> {
    return NotificationRepository.markAsRead(id, userId);
  }

  /**
   * Mark all notifications as read for authenticated user
   */
  static async markAllAsRead(userId: string): Promise<number> {
    return NotificationRepository.markAllAsRead(userId);
  }
}
