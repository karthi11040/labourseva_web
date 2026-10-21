import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { ensureMarketplaceSubscriptionTables } from "@/lib/marketplace-subscriptions";

type ReminderEvent = "ACTIVATED" | "EXPIRING_7D" | "EXPIRING_3D" | "EXPIRING_1D" | "EXPIRES_TODAY" | "EXPIRED_1D";
type Contact = { id: number; name: string; shop_name: string; email: string | null; phone: string | null; plan_name: string; expires_at: Date; starts_at: Date };

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://labourseva.com").replace(/\/$/, "");
const marketplaceUrl = `${appUrl}/retailer/marketplace`;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character]!);
}

function expiryDate(date: Date) {
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
}

function noticeFor(event: ReminderEvent, contact: Contact) {
  const name = contact.name || contact.shop_name || "Retailer";
  const formattedDate = expiryDate(contact.expires_at);
  if (event === "ACTIVATED") {
    const queued = new Date(contact.starts_at).getTime() > Date.now();
    return queued
      ? { subject: "Marketplace subscription renewal confirmed", message: `Hello ${name}, your ${contact.plan_name} plan payment is confirmed. It will start after your current subscription ends on ${expiryDate(contact.starts_at)}. Manage products: ${marketplaceUrl}` }
      : { subject: "Marketplace subscription active", message: `Hello ${name}, your ${contact.plan_name} subscription is active until ${formattedDate}. Add products and submit them for staff review: ${marketplaceUrl}` };
  }
  if (event === "EXPIRED_1D") {
    return { subject: "Renew your LabourSeva marketplace subscription", message: `Hello ${name}, your ${contact.plan_name} subscription expired on ${formattedDate}. Renew it to make eligible products visible and submit listings: ${marketplaceUrl}` };
  }
  if (event === "EXPIRES_TODAY") {
    return { subject: "Your marketplace subscription expires today", message: `Hello ${name}, your ${contact.plan_name} subscription expires today (${formattedDate}). Renew now to keep product listings eligible for marketplace visibility: ${marketplaceUrl}` };
  }
  const days = event === "EXPIRING_7D" ? 7 : event === "EXPIRING_3D" ? 3 : 1;
  return { subject: `Marketplace subscription expires in ${days} day${days === 1 ? "" : "s"}`, message: `Hello ${name}, your ${contact.plan_name} subscription expires on ${formattedDate} (in ${days} day${days === 1 ? "" : "s"}). Renew now to keep product listings eligible for marketplace visibility: ${marketplaceUrl}` };
}

async function sendChannel(contact: Contact, event: ReminderEvent, channel: "EMAIL" | "SMS", recipient: string) {
  const notice = noticeFor(event, contact);
  await prisma.$executeRawUnsafe(
    `INSERT IGNORE INTO retailer_marketplace_subscription_notifications (subscription_id, event_key, channel)
     VALUES (?, ?, ?)`, contact.id, event, channel
  );
  const claimed = await prisma.$executeRawUnsafe(
    `UPDATE retailer_marketplace_subscription_notifications
     SET status = 'SENDING', attempts = attempts + 1, next_attempt_at = NULL, last_error = NULL, updated_at = NOW()
     WHERE subscription_id = ? AND event_key = ? AND channel = ?
       AND status IN ('PENDING', 'FAILED') AND attempts < 5
       AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())`,
    contact.id, event, channel
  );
  if (!claimed) return;

  let result: { success: boolean; error?: string };
  try {
    result = channel === "EMAIL"
      ? await sendEmail({
          to: recipient,
          subject: notice.subject,
          text: notice.message,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#172554"><h2 style="color:#1e3a8a">LabourSeva marketplace</h2><p>${escapeHtml(notice.message.replace(marketplaceUrl, ""))}</p><p><a href="${escapeHtml(marketplaceUrl)}" style="display:inline-block;background:#1e3a8a;color:white;padding:12px 18px;border-radius:6px;text-decoration:none">Manage subscription and products</a></p><p style="color:#64748b;font-size:12px">Automated subscription notice for ${escapeHtml(contact.shop_name || contact.name)}.</p></div>`,
        })
      : await sendSms({ mobile: recipient, message: notice.message });
  } catch (error) {
    result = { success: false, error: error instanceof Error ? error.message : "Delivery failed." };
  }

  await prisma.$executeRawUnsafe(
    `UPDATE retailer_marketplace_subscription_notifications
     SET status = ?, sent_at = IF(? = 'SENT', NOW(), sent_at), last_error = ?,
         next_attempt_at = IF(? = 'FAILED', DATE_ADD(NOW(), INTERVAL 6 HOUR), NULL), updated_at = NOW()
     WHERE subscription_id = ? AND event_key = ? AND channel = ? AND status = 'SENDING'`,
    result.success ? "SENT" : "FAILED", result.success ? "SENT" : "FAILED", result.error?.slice(0, 500) || null,
    result.success ? "SENT" : "FAILED", contact.id, event, channel
  );
}

async function getContact(subscriptionId: number): Promise<Contact | null> {
  const [row] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT s.id, s.starts_at, s.expires_at, r.name, r.shop_name, r.email, r.phone, p.name AS plan_name
     FROM retailer_marketplace_subscriptions s
     JOIN retail_users r ON r.id = s.retailer_id
     LEFT JOIN marketplace_subscription_plans p ON p.id = s.plan_id
     WHERE s.id = ? LIMIT 1`, subscriptionId
  );
  return row ? { ...row, id: Number(row.id), starts_at: new Date(row.starts_at), expires_at: new Date(row.expires_at), plan_name: String(row.plan_name || "Marketplace") } as Contact : null;
}

export async function dispatchMarketplaceSubscriptionNotice(subscriptionId: number, event: ReminderEvent) {
  await ensureMarketplaceSubscriptionTables();
  const contact = await getContact(subscriptionId);
  if (!contact) return;
  const deliveries: Promise<void>[] = [];
  if (contact.email?.trim()) deliveries.push(sendChannel(contact, event, "EMAIL", contact.email.trim()));
  if (contact.phone?.trim()) deliveries.push(sendChannel(contact, event, "SMS", contact.phone.trim()));
  await Promise.allSettled(deliveries);
}

function eventForDaysRemaining(days: number): ReminderEvent | null {
  if (days >= 6 && days <= 7) return "EXPIRING_7D";
  if (days >= 2 && days <= 3) return "EXPIRING_3D";
  if (days === 1) return "EXPIRING_1D";
  if (days === 0) return "EXPIRES_TODAY";
  if (days >= -3 && days <= -1) return "EXPIRED_1D";
  return null;
}

export async function processMarketplaceSubscriptionNotices() {
  await ensureMarketplaceSubscriptionTables();
  await prisma.$executeRawUnsafe(
    `UPDATE retailer_marketplace_subscription_notifications
     SET status = 'FAILED', next_attempt_at = NOW(), last_error = 'Delivery worker restarted during send.'
     WHERE status = 'SENDING' AND updated_at < DATE_SUB(NOW(), INTERVAL 20 MINUTE)`
  );

  const retries = await prisma.$queryRawUnsafe<any[]>(
    `SELECT DISTINCT n.subscription_id, n.event_key
     FROM retailer_marketplace_subscription_notifications n
     JOIN retailer_marketplace_subscriptions s ON s.id = n.subscription_id
     WHERE n.status IN ('PENDING', 'FAILED') AND n.attempts < 5
       AND (n.next_attempt_at IS NULL OR n.next_attempt_at <= NOW())
       AND s.status IN ('ACTIVE', 'EXPIRED')
       AND (n.event_key <> 'ACTIVATED' OR n.created_at > DATE_SUB(NOW(), INTERVAL 3 DAY))
     LIMIT 200`
  );
  for (const row of retries) {
    await dispatchMarketplaceSubscriptionNotice(Number(row.subscription_id), String(row.event_key) as ReminderEvent);
  }

  const expiring = await prisma.$queryRawUnsafe<any[]>(
    `SELECT s.id, DATEDIFF(DATE(s.expires_at), CURDATE()) AS days_remaining
     FROM retailer_marketplace_subscriptions s
     WHERE s.status IN ('ACTIVE', 'EXPIRED') AND s.starts_at <= NOW()
       AND DATEDIFF(DATE(s.expires_at), CURDATE()) BETWEEN -3 AND 7
       AND NOT EXISTS (
         SELECT 1 FROM retailer_marketplace_subscriptions next_s
         WHERE next_s.retailer_id = s.retailer_id AND next_s.id <> s.id
           AND next_s.status = 'ACTIVE' AND next_s.starts_at >= s.expires_at
       )
     ORDER BY s.expires_at ASC LIMIT 200`
  );
  for (const row of expiring) {
    const event = eventForDaysRemaining(Number(row.days_remaining));
    if (event) await dispatchMarketplaceSubscriptionNotice(Number(row.id), event);
  }
}
