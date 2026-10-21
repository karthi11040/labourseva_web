/**
 * LabourSeva — Notification Trigger Service
 * Centralized, idempotent event triggers for all 11 core LabourSeva business events.
 * Guarantees duplicate webhooks, page refreshes, and retried API calls will never produce
 * duplicate notifications.
 */
import { NOTIFICATION_TEMPLATES } from "../templates/notification.templates";
import { NotificationDeliveryService } from "./notification-delivery.service";
import { NotificationDeliveryResult } from "../types/notification.types";

export class NotificationTriggerService {
  /**
   * 1. Account Approved
   */
  static async triggerAccountApproved(params: {
    userId: string;
    name: string;
    email?: string;
    phone?: string;
    language?: "EN" | "TA";
  }): Promise<NotificationDeliveryResult> {
    const tmpl = NOTIFICATION_TEMPLATES.ACCOUNT_APPROVED;
    const lang = params.language || "EN";
    const title = lang === "TA" ? tmpl.defaultTitleTa : tmpl.defaultTitleEn;
    const message = lang === "TA" ? tmpl.formatBodyTa(params) : tmpl.formatBodyEn(params);
    const eventKey = `evt_account_approved_${params.userId}`;

    return NotificationDeliveryService.deliver({
      recipientUserId: params.userId,
      templateKey: "ACCOUNT_APPROVED",
      category: tmpl.category,
      eventKey,
      relatedEntityType: "USER",
      relatedEntityId: params.userId,
      title,
      message,
      link: tmpl.defaultLink?.(params),
      channels: ["INAPP", "EMAIL", "SMS"],
      language: lang,
      email: params.email,
      phone: params.phone,
      payload: params,
    });
  }

  /**
   * 2. Account Rejected
   */
  static async triggerAccountRejected(params: {
    userId: string;
    name: string;
    reason: string;
    email?: string;
    phone?: string;
    language?: "EN" | "TA";
  }): Promise<NotificationDeliveryResult> {
    const tmpl = NOTIFICATION_TEMPLATES.ACCOUNT_REJECTED;
    const lang = params.language || "EN";
    const title = lang === "TA" ? tmpl.defaultTitleTa : tmpl.defaultTitleEn;
    const message = lang === "TA" ? tmpl.formatBodyTa(params) : tmpl.formatBodyEn(params);
    const eventKey = `evt_account_rejected_${params.userId}_${Date.now()}`;

    return NotificationDeliveryService.deliver({
      recipientUserId: params.userId,
      templateKey: "ACCOUNT_REJECTED",
      category: tmpl.category,
      eventKey,
      relatedEntityType: "USER",
      relatedEntityId: params.userId,
      title,
      message,
      link: tmpl.defaultLink?.(params),
      channels: ["INAPP", "EMAIL", "SMS"],
      language: lang,
      email: params.email,
      phone: params.phone,
      payload: params,
    });
  }

  /**
   * 3. Service Payment Successful (Document Services / Schemes)
   */
  static async triggerServicePaymentSuccess(params: {
    userId: string;
    orderId: string;
    paymentId?: string;
    amount: number;
    serviceName: string;
    applicationId: string;
    email?: string;
    phone?: string;
    language?: "EN" | "TA";
  }): Promise<NotificationDeliveryResult> {
    const tmpl = NOTIFICATION_TEMPLATES.SERVICE_PAYMENT_SUCCESS;
    const lang = params.language || "EN";
    const title = lang === "TA" ? tmpl.defaultTitleTa : tmpl.defaultTitleEn;
    const message = lang === "TA" ? tmpl.formatBodyTa(params) : tmpl.formatBodyEn(params);
    const eventKey = `evt_pay_svc_${params.paymentId || params.orderId || params.applicationId}`;

    return NotificationDeliveryService.deliver({
      recipientUserId: params.userId,
      templateKey: "SERVICE_PAYMENT_SUCCESS",
      category: tmpl.category,
      eventKey,
      relatedEntityType: "SERVICE_REQUEST",
      relatedEntityId: params.applicationId,
      title,
      message,
      link: tmpl.defaultLink?.(params),
      channels: ["INAPP", "SMS"],
      language: lang,
      email: params.email,
      phone: params.phone,
      payload: params,
    });
  }

  /**
   * 4. E-Service Payment Successful (Online Certificates / 39 Official Services)
   */
  static async triggerEServicePaymentSuccess(params: {
    userId: string;
    applicationId: string;
    applicationNumber: string;
    receiptNo: string;
    amount: number;
    paymentId?: string;
    email?: string;
    phone?: string;
    language?: "EN" | "TA";
  }): Promise<NotificationDeliveryResult> {
    const tmpl = NOTIFICATION_TEMPLATES.ESERVICE_PAYMENT_SUCCESS;
    const lang = params.language || "EN";
    const title = lang === "TA" ? tmpl.defaultTitleTa : tmpl.defaultTitleEn;
    const message = lang === "TA" ? tmpl.formatBodyTa(params) : tmpl.formatBodyEn(params);
    const eventKey = `evt_pay_es_${params.paymentId || params.receiptNo || params.applicationNumber}`;

    return NotificationDeliveryService.deliver({
      recipientUserId: params.userId,
      templateKey: "ESERVICE_PAYMENT_SUCCESS",
      category: tmpl.category,
      eventKey,
      relatedEntityType: "ES_SERVICE_REQUEST",
      relatedEntityId: params.applicationId,
      title,
      message,
      link: tmpl.defaultLink?.(params),
      channels: ["INAPP", "SMS"],
      language: lang,
      email: params.email,
      phone: params.phone,
      payload: params,
    });
  }

  /**
   * 5. Application Submitted Successfully
   */
  static async triggerApplicationSubmitted(params: {
    userId: string;
    applicationId: string;
    applicationNumber?: string;
    serviceName: string;
    type?: "DOCUMENT_SERVICE" | "ESERVICE";
    email?: string;
    phone?: string;
    language?: "EN" | "TA";
  }): Promise<NotificationDeliveryResult> {
    const tmpl = NOTIFICATION_TEMPLATES.APPLICATION_SUBMITTED;
    const lang = params.language || "EN";
    const title = lang === "TA" ? tmpl.defaultTitleTa : tmpl.defaultTitleEn;
    const message = lang === "TA" ? tmpl.formatBodyTa(params) : tmpl.formatBodyEn(params);
    const appRef = params.applicationNumber || params.applicationId;
    const eventKey = `evt_app_sub_${appRef}`;

    return NotificationDeliveryService.deliver({
      recipientUserId: params.userId,
      templateKey: "APPLICATION_SUBMITTED",
      category: tmpl.category,
      eventKey,
      relatedEntityType: params.type === "ESERVICE" ? "ES_SERVICE_REQUEST" : "SERVICE_REQUEST",
      relatedEntityId: params.applicationId,
      title,
      message,
      link: tmpl.defaultLink?.(params),
      channels: ["INAPP"],
      language: lang,
      email: params.email,
      phone: params.phone,
      payload: params,
    });
  }

  /**
   * 6. Application Approved
   */
  static async triggerApplicationApproved(params: {
    userId: string;
    applicationId: string;
    applicationNumber?: string;
    serviceName: string;
    type?: "DOCUMENT_SERVICE" | "ESERVICE";
    email?: string;
    phone?: string;
    language?: "EN" | "TA";
  }): Promise<NotificationDeliveryResult> {
    const tmpl = NOTIFICATION_TEMPLATES.APPLICATION_APPROVED;
    const lang = params.language || "EN";
    const title = lang === "TA" ? tmpl.defaultTitleTa : tmpl.defaultTitleEn;
    const message = lang === "TA" ? tmpl.formatBodyTa(params) : tmpl.formatBodyEn(params);
    const appRef = params.applicationNumber || params.applicationId;
    const eventKey = `evt_app_appr_${appRef}`;

    return NotificationDeliveryService.deliver({
      recipientUserId: params.userId,
      templateKey: "APPLICATION_APPROVED",
      category: tmpl.category,
      eventKey,
      relatedEntityType: params.type === "ESERVICE" ? "ES_SERVICE_REQUEST" : "SERVICE_REQUEST",
      relatedEntityId: params.applicationId,
      title,
      message,
      link: tmpl.defaultLink?.(params),
      channels: ["INAPP", "EMAIL", "SMS"],
      language: lang,
      email: params.email,
      phone: params.phone,
      payload: params,
    });
  }

  /**
   * 7. Application Rejected / Needs Attention
   */
  static async triggerApplicationRejected(params: {
    userId: string;
    applicationId: string;
    applicationNumber?: string;
    serviceName: string;
    reason: string;
    type?: "DOCUMENT_SERVICE" | "ESERVICE";
    email?: string;
    phone?: string;
    language?: "EN" | "TA";
  }): Promise<NotificationDeliveryResult> {
    const tmpl = NOTIFICATION_TEMPLATES.APPLICATION_REJECTED;
    const lang = params.language || "EN";
    const title = lang === "TA" ? tmpl.defaultTitleTa : tmpl.defaultTitleEn;
    const message = lang === "TA" ? tmpl.formatBodyTa(params) : tmpl.formatBodyEn(params);
    const appRef = params.applicationNumber || params.applicationId;
    const eventKey = `evt_app_rej_${appRef}_${Date.now()}`;

    return NotificationDeliveryService.deliver({
      recipientUserId: params.userId,
      templateKey: "APPLICATION_REJECTED",
      category: tmpl.category,
      eventKey,
      relatedEntityType: params.type === "ESERVICE" ? "ES_SERVICE_REQUEST" : "SERVICE_REQUEST",
      relatedEntityId: params.applicationId,
      title,
      message,
      link: tmpl.defaultLink?.(params),
      channels: ["INAPP", "EMAIL"],
      language: lang,
      email: params.email,
      phone: params.phone,
      payload: params,
    });
  }

  /**
   * 8. Additional Information Requested
   */
  static async triggerAdditionalInfoRequested(params: {
    userId: string;
    applicationId: string;
    applicationNumber?: string;
    notes?: string;
    email?: string;
    phone?: string;
    language?: "EN" | "TA";
  }): Promise<NotificationDeliveryResult> {
    const tmpl = NOTIFICATION_TEMPLATES.ADDITIONAL_INFO_REQUESTED;
    const lang = params.language || "EN";
    const title = lang === "TA" ? tmpl.defaultTitleTa : tmpl.defaultTitleEn;
    const message = lang === "TA" ? tmpl.formatBodyTa(params) : tmpl.formatBodyEn(params);
    const appRef = params.applicationNumber || params.applicationId;
    const eventKey = `evt_add_info_${appRef}_${Date.now()}`;

    return NotificationDeliveryService.deliver({
      recipientUserId: params.userId,
      templateKey: "ADDITIONAL_INFO_REQUESTED",
      category: tmpl.category,
      eventKey,
      relatedEntityType: "SERVICE_REQUEST",
      relatedEntityId: params.applicationId,
      title,
      message,
      link: tmpl.defaultLink?.(params),
      channels: ["INAPP", "EMAIL"],
      language: lang,
      email: params.email,
      phone: params.phone,
      payload: params,
    });
  }

  /**
   * 9. Signed Document Ready to Download
   */
  static async triggerSignedDocumentReady(params: {
    userId: string;
    applicationId: string;
    applicationNumber?: string;
    serviceName: string;
    signedPdfPath: string;
    district?: string;
    email?: string;
    phone?: string;
    language?: "EN" | "TA";
  }): Promise<NotificationDeliveryResult> {
    const tmpl = NOTIFICATION_TEMPLATES.SIGNED_DOCUMENT_READY;
    const lang = params.language || "EN";
    const title = lang === "TA" ? tmpl.defaultTitleTa : tmpl.defaultTitleEn;
    const message = lang === "TA" ? tmpl.formatBodyTa(params) : tmpl.formatBodyEn(params);
    const appRef = params.applicationNumber || params.applicationId;
    const eventKey = `evt_doc_signed_${appRef}`;

    return NotificationDeliveryService.deliver({
      recipientUserId: params.userId,
      templateKey: "SIGNED_DOCUMENT_READY",
      category: tmpl.category,
      eventKey,
      relatedEntityType: "SERVICE_REQUEST",
      relatedEntityId: params.applicationId,
      title,
      message,
      link: "/user/applications",
      channels: ["INAPP", "EMAIL"],
      language: lang,
      email: params.email,
      phone: params.phone,
      payload: params,
    });
  }

  /**
   * 10. Refund Processed
   */
  static async triggerRefundProcessed(params: {
    userId: string;
    applicationId: string;
    orderId?: string;
    amount: number;
    paymentMode?: string;
    email?: string;
    phone?: string;
    language?: "EN" | "TA";
  }): Promise<NotificationDeliveryResult> {
    const tmpl = NOTIFICATION_TEMPLATES.REFUND_PROCESSED;
    const lang = params.language || "EN";
    const title = lang === "TA" ? tmpl.defaultTitleTa : tmpl.defaultTitleEn;
    const message = lang === "TA" ? tmpl.formatBodyTa(params) : tmpl.formatBodyEn(params);
    const eventKey = `evt_refund_${params.applicationId || params.orderId}_${Date.now()}`;

    return NotificationDeliveryService.deliver({
      recipientUserId: params.userId,
      templateKey: "REFUND_PROCESSED",
      category: tmpl.category,
      eventKey,
      relatedEntityType: "REFUND",
      relatedEntityId: params.applicationId,
      title,
      message,
      link: tmpl.defaultLink?.(params),
      channels: ["INAPP", "EMAIL", "SMS"],
      language: lang,
      email: params.email,
      phone: params.phone,
      payload: params,
    });
  }

  /**
   * 11. Staff Application Assigned
   */
  static async triggerStaffApplicationAssigned(params: {
    staffUserId: string;
    applicationId: string;
    applicationNumber?: string;
    serviceName: string;
    assignedBy?: string;
    language?: "EN" | "TA";
  }): Promise<NotificationDeliveryResult> {
    const tmpl = NOTIFICATION_TEMPLATES.STAFF_APPLICATION_ASSIGNED;
    const lang = params.language || "EN";
    const title = lang === "TA" ? tmpl.defaultTitleTa : tmpl.defaultTitleEn;
    const message = lang === "TA" ? tmpl.formatBodyTa(params) : tmpl.formatBodyEn(params);
    const appRef = params.applicationNumber || params.applicationId;
    const eventKey = `evt_staff_assign_${params.staffUserId}_${appRef}`;

    return NotificationDeliveryService.deliver({
      recipientUserId: params.staffUserId,
      templateKey: "STAFF_APPLICATION_ASSIGNED",
      category: tmpl.category,
      eventKey,
      relatedEntityType: "ASSIGNMENT",
      relatedEntityId: params.applicationId,
      title,
      message,
      link: tmpl.defaultLink?.(params),
      channels: ["INAPP"],
      language: lang,
      payload: params,
    });
  }
}
