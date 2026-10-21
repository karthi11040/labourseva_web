/**
 * LabourSeva — Modular Notification Types
 * Defines comprehensive contracts for notifications across In-App, SMS, and Email.
 */

export type NotificationChannel = "INAPP" | "WEB" | "SMS" | "EMAIL";

export type NotificationCategory =
  | "APPLICATION"
  | "PAYMENT"
  | "ACCOUNT"
  | "DOCUMENT"
  | "REFUND"
  | "ASSIGNMENT"
  | "SYSTEM";

export type NotificationTemplateKey =
  | "ACCOUNT_APPROVED"
  | "ACCOUNT_REJECTED"
  | "SERVICE_PAYMENT_SUCCESS"
  | "ESERVICE_PAYMENT_SUCCESS"
  | "APPLICATION_SUBMITTED"
  | "APPLICATION_APPROVED"
  | "APPLICATION_REJECTED"
  | "ADDITIONAL_INFO_REQUESTED"
  | "SIGNED_DOCUMENT_READY"
  | "REFUND_PROCESSED"
  | "STAFF_APPLICATION_ASSIGNED"
  | "SERVICE_CONFIRMED"
  | "DOCUMENT_UPLOADED";

export type NotificationDeliveryStatus = "QUEUED" | "SENDING" | "SENT" | "DELIVERED" | "FAILED";

export interface InAppNotificationItem {
  id: string;
  recipientUserId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  templateKey: string;
  eventKey: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
  channel: NotificationChannel;
  payload?: Record<string, any> | null;
}

export type NotificationFilter = "ALL" | "UNREAD" | "READ";

export interface NotificationQueryParams {
  userId: string;
  page?: number;
  limit?: number;
  filter?: NotificationFilter;
  category?: string;
}

export interface NotificationListResponse {
  ok: boolean;
  notifications: InAppNotificationItem[];
  unreadCount: number;
  totalCount: number;
  hasMore: boolean;
  page: number;
  limit: number;
  error?: string;
}

export interface CreateNotificationInput {
  recipientUserId: string;
  templateKey: NotificationTemplateKey | string;
  title: string;
  message: string;
  category?: NotificationCategory;
  eventKey?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  link?: string;
  channels?: NotificationChannel[];
  language?: "EN" | "TA";
  phone?: string;
  email?: string;
  payload?: Record<string, any>;
}

export interface NotificationDeliveryResult {
  inAppSaved: boolean;
  emailSent?: boolean;
  smsSent?: boolean;
  notificationId?: string;
  alreadyExisted?: boolean;
  errors?: string[];
}
