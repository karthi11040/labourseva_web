/**
 * LabourSeva — Notification Repository
 * Encapsulates all database persistence operations, index optimizations,
 * and user-isolation query constraints.
 */
import { prisma } from "@/lib/prisma";
import {
  InAppNotificationItem,
  NotificationCategory,
  NotificationChannel,
  NotificationFilter,
  NotificationQueryParams,
} from "../types/notification.types";

export class NotificationRepository {
  /**
   * Parses a raw DB row into a clean InAppNotificationItem domain entity
   */
  private static mapRowToEntity(row: any): InAppNotificationItem {
    let payload: Record<string, any> = {};
    if (row.payload) {
      if (typeof row.payload === "string") {
        try {
          payload = JSON.parse(row.payload);
        } catch {
          payload = {};
        }
      } else if (typeof row.payload === "object") {
        payload = row.payload;
      }
    }

    const title = payload.title || row.templateKey || "Notification";
    const message = payload.body || payload.message || "";
    const category: NotificationCategory =
      (payload.category as NotificationCategory) ||
      (row.relatedEntityType as NotificationCategory) ||
      this.inferCategory(row.templateKey);

    return {
      id: String(row.id),
      recipientUserId: String(row.userId || ""),
      title,
      message,
      category,
      templateKey: row.templateKey || "SYSTEM",
      eventKey: row.eventKey || payload.eventKey || null,
      relatedEntityType: row.relatedEntityType || payload.relatedEntityType || null,
      relatedEntityId: row.relatedEntityId || payload.relatedEntityId || payload.applicationId || null,
      link: payload.link || null,
      isRead: !!row.readAt,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt || new Date().toISOString()),
      readAt: row.readAt instanceof Date ? row.readAt.toISOString() : (row.readAt ? String(row.readAt) : null),
      channel: (row.channel as NotificationChannel) || "INAPP",
      payload,
    };
  }

  private static inferCategory(templateKey?: string): NotificationCategory {
    if (!templateKey) return "SYSTEM";
    const k = templateKey.toUpperCase();
    if (k.includes("PAYMENT")) return "PAYMENT";
    if (k.includes("ACCOUNT")) return "ACCOUNT";
    if (k.includes("DOCUMENT") || k.includes("SIGNED")) return "DOCUMENT";
    if (k.includes("REFUND")) return "REFUND";
    if (k.includes("STAFF") || k.includes("ASSIGN")) return "ASSIGNMENT";
    return "APPLICATION";
  }

  /**
   * Find paginated notifications for an authenticated user with optional filter
   */
  static async findUserNotifications(params: NotificationQueryParams): Promise<{
    notifications: InAppNotificationItem[];
    totalCount: number;
    unreadCount: number;
  }> {
    const userId = String(params.userId);
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.min(100, Math.max(1, Number(params.limit || 20)));
    const offset = (page - 1) * limit;
    const filter: NotificationFilter = params.filter || "ALL";

    // Build read filter condition
    let readClause = "";
    if (filter === "UNREAD") {
      readClause = "AND `readAt` IS NULL";
    } else if (filter === "READ") {
      readClause = "AND `readAt` IS NOT NULL";
    }

    // Support flexible user identifiers (e.g. user phone or customer id or '1')
    // We match notifications for this specific recipient userId
    const [rows, countRows, unreadRows] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(
        `SELECT id, userId, channel, templateKey, eventKey, relatedEntityType, relatedEntityId, status, payload, createdAt, readAt
         FROM \`notifications\`
         WHERE \`userId\` = ?
           AND \`channel\` IN ('INAPP', 'WEB')
           ${readClause}
         ORDER BY \`createdAt\` DESC
         LIMIT ? OFFSET ?`,
        userId,
        limit,
        offset
      ).catch(() => []),

      prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) as cnt
         FROM \`notifications\`
         WHERE \`userId\` = ?
           AND \`channel\` IN ('INAPP', 'WEB')
           ${readClause}`,
        userId
      ).catch(() => [{ cnt: 0 }]),

      prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) as cnt
         FROM \`notifications\`
         WHERE \`userId\` = ?
           AND \`channel\` IN ('INAPP', 'WEB')
           AND \`readAt\` IS NULL`,
        userId
      ).catch(() => [{ cnt: 0 }]),
    ]);

    const totalCount = Number(countRows[0]?.cnt || 0);
    const unreadCount = Number(unreadRows[0]?.cnt || 0);
    const notifications = rows.map((r) => this.mapRowToEntity(r));

    return { notifications, totalCount, unreadCount };
  }

  /**
   * Return lightweight unread count for the notification bell badge
   */
  static async countUnread(userId: string): Promise<number> {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*) as cnt
       FROM \`notifications\`
       WHERE \`userId\` = ?
         AND \`channel\` IN ('INAPP', 'WEB')
         AND \`readAt\` IS NULL`,
      String(userId)
    ).catch(() => [{ cnt: 0 }]);

    return Number(rows[0]?.cnt || 0);
  }

  /**
   * Mark a single notification as read, enforcing user ownership!
   */
  static async markAsRead(id: string, userId: string): Promise<boolean> {
    const res = await prisma.$executeRawUnsafe(
      `UPDATE \`notifications\`
       SET \`readAt\` = NOW(3)
       WHERE \`id\` = ? AND \`userId\` = ? AND \`readAt\` IS NULL`,
      BigInt(id),
      String(userId)
    ).catch(() => 0);

    return res > 0;
  }

  /**
   * Mark all unread notifications as read for an authenticated user
   */
  static async markAllAsRead(userId: string): Promise<number> {
    const count = await prisma.$executeRawUnsafe(
      `UPDATE \`notifications\`
       SET \`readAt\` = NOW(3)
       WHERE \`userId\` = ?
         AND \`channel\` IN ('INAPP', 'WEB')
         AND \`readAt\` IS NULL`,
      String(userId)
    ).catch(() => 0);

    return count;
  }

  /**
   * Find notification by unique eventKey (Idempotency check)
   */
  static async findByEventKey(eventKey: string): Promise<InAppNotificationItem | null> {
    if (!eventKey) return null;
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, userId, channel, templateKey, eventKey, relatedEntityType, relatedEntityId, status, payload, createdAt, readAt
       FROM \`notifications\`
       WHERE \`eventKey\` = ?
       LIMIT 1`,
      eventKey
    ).catch(() => []);

    if (!rows || rows.length === 0) return null;
    return this.mapRowToEntity(rows[0]);
  }

  /**
   * Insert a new notification record idempotently
   */
  static async createNotificationRecord(params: {
    userId: string;
    channel: NotificationChannel;
    templateKey: string;
    eventKey?: string | null;
    relatedEntityType?: string | null;
    relatedEntityId?: string | null;
    language?: "EN" | "TA";
    status?: string;
    title: string;
    body: string;
    payload?: Record<string, any>;
  }): Promise<{ id: string; created: boolean }> {
    const payloadObject = {
      title: params.title,
      body: params.body,
      ...(params.payload || {}),
    };
    const payloadStr = JSON.stringify(payloadObject);

    // If eventKey is provided, check if it already exists
    if (params.eventKey) {
      const existing = await this.findByEventKey(params.eventKey);
      if (existing) {
        return { id: existing.id, created: false };
      }
    }

    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO \`notifications\` 
          (\`userId\`, \`channel\`, \`templateKey\`, \`eventKey\`, \`relatedEntityType\`, \`relatedEntityId\`, \`language\`, \`status\`, \`payload\`, \`createdAt\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))`,
        String(params.userId),
        params.channel,
        params.templateKey,
        params.eventKey || null,
        params.relatedEntityType || null,
        params.relatedEntityId || null,
        params.language || "EN",
        params.status || "DELIVERED",
        payloadStr
      );

      const idRows = await prisma.$queryRawUnsafe<any[]>(
        "SELECT LAST_INSERT_ID() as lastId"
      ).catch(() => []);
      const newId = String(idRows[0]?.lastId || "");
      return { id: newId, created: true };
    } catch (insertErr: any) {
      // Check if duplicate key error occurred on eventKey
      if (params.eventKey && (insertErr.message?.includes("Duplicate") || insertErr.code === "ER_DUP_ENTRY")) {
        const existing = await this.findByEventKey(params.eventKey);
        if (existing) return { id: existing.id, created: false };
      }
      throw insertErr;
    }
  }
}
