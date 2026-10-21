import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";
import { sendEmail } from "@/lib/email";

export interface CreateNotificationParams {
  userId?: string | number | null;
  templateKey: string;
  title: string;
  body: string;
  link?: string;
  channel?: "INAPP" | "WEB" | "SMS" | "EMAIL";
  language?: "EN" | "TA";
  metadata?: Record<string, any>;
  phone?: string;
  email?: string;
}

/**
 * Creates a notification in the database and optionally dispatches via SMS or Email
 */
export async function createInAppNotification(params: CreateNotificationParams) {
  const channel = params.channel || "INAPP";

  // If SMS channel is requested, dispatch via SMS gateway
  if (channel === "SMS" && params.phone) {
    try {
      await sendSms({
        mobile: params.phone,
        message: `${params.title}: ${params.body}`,
      });
    } catch (smsErr) {
      console.error("[Notification SMS Dispatch Error]:", smsErr);
    }
  }

  // If Email channel is requested, dispatch via SMTP
  if (channel === "EMAIL" && params.email) {
    try {
      await sendEmail({
        to: params.email,
        subject: params.title,
        html: `<p>${params.body}</p>`,
      });
    } catch (emailErr) {
      console.error("[Notification Email Dispatch Error]:", emailErr);
    }
  }

  try {
    const rawUserId = params.userId ? String(params.userId) : "1";
    const payload = {
      title: params.title,
      body: params.body,
      link: params.link || "/user/applications",
      phone: params.phone,
      email: params.email,
      ...(params.metadata || {}),
    };

    const record = await prisma.notification.create({
      data: {
        userId: rawUserId,
        channel,
        templateKey: params.templateKey,
        language: params.language || "EN",
        status: "DELIVERED",
        payload,
      },
    });

    return { ok: true, id: record.id.toString() };
  } catch (err: any) {
    console.error("Prisma create notification error, attempting raw fallback:", err?.message);
    try {
      const rawUserId = params.userId ? String(params.userId) : "1";
      const payloadStr = JSON.stringify({
        title: params.title,
        body: params.body,
        link: params.link || "/user/applications",
        phone: params.phone,
        email: params.email,
        ...(params.metadata || {}),
      }).replace(/'/g, "''");

      await prisma.$executeRawUnsafe(`
        INSERT INTO \`notifications\` (\`userId\`, \`channel\`, \`templateKey\`, \`language\`, \`status\`, \`payload\`, \`createdAt\`)
        VALUES ('${rawUserId}', '${channel}', '${params.templateKey}', '${params.language || "EN"}', 'DELIVERED', '${payloadStr}', NOW(3))
      `);
      return { ok: true };
    } catch (rawErr: any) {
      console.error("Failed to insert notification via raw query:", rawErr?.message);
      return { ok: false, error: rawErr?.message };
    }
  }
}
