import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export async function getMarketplaceSubscriptionReceipt(subscriptionId: number, retailerId: number) {
  const [row] = await prisma.$queryRawUnsafe<any[]>(
    `SELECT s.id, s.razorpay_order_id, s.razorpay_payment_id, s.amount_paise, s.created_at,
            p.name AS plan_name, p.billing_period, r.name, r.shop_name, r.email, r.phone, r.registration_no
     FROM retailer_marketplace_subscriptions s
     JOIN retail_users r ON r.id = s.retailer_id
     LEFT JOIN marketplace_subscription_plans p ON p.id = s.plan_id
     WHERE s.id = ? AND s.retailer_id = ? LIMIT 1`,
    subscriptionId, retailerId
  );
  if (!row) return null;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.1, 0.2, 0.4);
  page.drawText("LabourSeva", { x: 48, y: 780, size: 24, font: bold, color: ink });
  page.drawText("MARKETPLACE SUBSCRIPTION RECEIPT", { x: 48, y: 738, size: 15, font: bold });
  page.drawText(`Receipt: MKT-${row.id}`, { x: 48, y: 700, size: 11, font: regular });
  page.drawText(`Date: ${new Date(row.created_at).toLocaleDateString("en-IN")}`, { x: 48, y: 680, size: 11, font: regular });
  page.drawLine({ start: { x: 48, y: 660 }, end: { x: 547, y: 660 }, thickness: 1, color: ink });
  const fields = [
    ["Retailer", row.shop_name || row.name || "Retailer"],
    ["Registration", row.registration_no || "-"],
    ["Plan", row.plan_name || "Marketplace subscription"],
    ["Billing period", row.billing_period || "-"],
    ["Amount paid", `INR ${(Number(row.amount_paise) / 100).toFixed(2)}`],
    ["Payment reference", row.razorpay_payment_id || row.razorpay_order_id || "-"],
  ];
  let y = 625;
  for (const [label, value] of fields) {
    page.drawText(label, { x: 48, y, size: 10, font: bold, color: ink });
    page.drawText(String(value).replace(/[^\x20-\x7E]/g, " ").slice(0, 80), { x: 200, y, size: 10, font: regular });
    y -= 32;
  }
  page.drawText("Payment status: SUCCESSFUL", { x: 48, y: y - 12, size: 11, font: bold, color: ink });
  page.drawText("Computer-generated receipt for your records.", { x: 48, y: 70, size: 9, font: regular });
  return { row, bytes: Buffer.from(await pdf.save()), filename: `LabourSeva-MKT-${row.id}.pdf` };
}

export async function emailMarketplaceSubscriptionReceipt(subscriptionId: number) {
  const [owner] = await prisma.$queryRawUnsafe<any[]>(
    "SELECT retailer_id FROM retailer_marketplace_subscriptions WHERE id = ? LIMIT 1", subscriptionId
  );
  if (!owner) return;
  const receipt = await getMarketplaceSubscriptionReceipt(subscriptionId, Number(owner.retailer_id));
  if (!receipt || !String(receipt.row.email || "").includes("@")) return;
  const result = await sendEmail({
    to: String(receipt.row.email),
    subject: `LabourSeva subscription receipt MKT-${receipt.row.id}`,
    text: `Payment received for ${receipt.row.plan_name || "your marketplace subscription"}. Amount: INR ${(Number(receipt.row.amount_paise) / 100).toFixed(2)}. Receipt MKT-${receipt.row.id} is attached.`,
    html: `<p>Payment received for your LabourSeva marketplace subscription.</p><p>Receipt <strong>MKT-${receipt.row.id}</strong> for INR ${(Number(receipt.row.amount_paise) / 100).toFixed(2)} is attached.</p>`,
    attachments: [{ filename: receipt.filename, content: receipt.bytes, contentType: "application/pdf" }],
  });
  if (!result.success) console.error("Marketplace subscription receipt email failed:", result.error);
}
