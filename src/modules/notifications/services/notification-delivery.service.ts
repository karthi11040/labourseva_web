/**
 * LabourSeva — Notification Delivery Service
 * Coordinates multi-channel notification dispatches (In-App, SMS, Email).
 * Ensures failure of external communication gateways (SMTP / SMS provider)
 * never rolls back or fails core financial or application business transactions.
 */
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { NotificationRepository } from "../repositories/notification.repository";
import { CreateNotificationInput, NotificationDeliveryResult } from "../types/notification.types";

export class NotificationDeliveryService {
  /**
   * Dispatches a notification across all requested channels.
   * In-App is always recorded first as the persistent record.
   */
  static async deliver(input: CreateNotificationInput): Promise<NotificationDeliveryResult> {
    const channels = input.channels && input.channels.length > 0 ? input.channels : ["INAPP"];
    const result: NotificationDeliveryResult = {
      inAppSaved: false,
      errors: [],
    };

    // 1. IN-APP Notification (Persistent in database)
    if (channels.includes("INAPP") || channels.includes("WEB")) {
      try {
        const inAppRes = await NotificationRepository.createNotificationRecord({
          userId: input.recipientUserId,
          channel: "INAPP",
          templateKey: input.templateKey,
          eventKey: input.eventKey,
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          language: input.language || "EN",
          title: input.title,
          body: input.message,
          payload: {
            link: input.link,
            category: input.category,
            phone: input.phone,
            email: input.email,
            ...(input.payload || {}),
          },
        });

        result.inAppSaved = true;
        result.notificationId = inAppRes.id;
        result.alreadyExisted = !inAppRes.created;
      } catch (err: any) {
        console.error("[NotificationDelivery] Failed to record in-app notification:", err?.message || err);
        result.errors?.push(`In-App error: ${err?.message || "Storage failure"}`);
      }
    }

    // 2. SMS Notification (If requested and phone is provided)
    if (channels.includes("SMS") && input.phone) {
      try {
        const smsText = `${input.title}: ${input.message}`;
        const smsRes = await sendSms({
          mobile: input.phone,
          message: smsText,
        });
        result.smsSent = smsRes.success;

        // Log SMS outbox attempt in notifications table
        await NotificationRepository.createNotificationRecord({
          userId: input.recipientUserId,
          channel: "SMS",
          templateKey: input.templateKey,
          eventKey: input.eventKey ? `${input.eventKey}_sms` : null,
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          language: input.language || "EN",
          status: smsRes.success ? "DELIVERED" : "FAILED",
          title: input.title,
          body: input.message,
          payload: {
            recipient: input.phone,
            providerResponse: smsRes,
          },
        }).catch(() => {});
      } catch (smsErr: any) {
        console.warn("[NotificationDelivery] SMS dispatch non-fatal error:", smsErr?.message || smsErr);
        result.smsSent = false;
        result.errors?.push(`SMS dispatch error: ${smsErr?.message || "Gateway unavailable"}`);
      }
    }

    // 3. Email Notification (If requested and email is provided)
    if (channels.includes("EMAIL") && input.email) {
      try {
        const emailRes = await sendEmail({
          to: input.email,
          subject: input.title,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
              <div style="border-bottom: 3px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 16px;">
                <h2 style="color: #1e3a8a; margin: 0; font-size: 20px;">LabourSeva Notification</h2>
                <p style="color: #64748b; font-size: 12px; margin: 4px 0 0 0;">Government of Tamil Nadu Welfare Services</p>
              </div>
              <h3 style="color: #0f172a; font-size: 16px; margin: 0 0 12px 0;">${input.title}</h3>
              <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">${input.message}</p>
              ${
                input.link
                  ? `<div style="margin: 20px 0;">
                      <a href="${input.link.startsWith("http") ? input.link : `https://labourseva.com${input.link}`}" style="background-color: #1e3a8a; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: bold; display: inline-block;">View in Portal</a>
                    </div>`
                  : ""
              }
              <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 24px; font-size: 11px; color: #94a3b8;">
                This is an automated system notification from LabourSeva. Please do not reply to this email.
              </div>
            </div>
          `,
          text: `${input.title}\n\n${input.message}\n\nLabourSeva Portal`,
        });

        result.emailSent = emailRes.success;

        // Log Email outbox attempt in notifications table
        await NotificationRepository.createNotificationRecord({
          userId: input.recipientUserId,
          channel: "EMAIL",
          templateKey: input.templateKey,
          eventKey: input.eventKey ? `${input.eventKey}_email` : null,
          relatedEntityType: input.relatedEntityType,
          relatedEntityId: input.relatedEntityId,
          language: input.language || "EN",
          status: emailRes.success ? "DELIVERED" : "FAILED",
          title: input.title,
          body: input.message,
          payload: {
            recipient: input.email,
            providerResponse: emailRes,
          },
        }).catch(() => {});
      } catch (emailErr: any) {
        console.warn("[NotificationDelivery] Email dispatch non-fatal error:", emailErr?.message || emailErr);
        result.emailSent = false;
        result.errors?.push(`Email dispatch error: ${emailErr?.message || "SMTP error"}`);
      }
    }

    return result;
  }
}
