import { getRazorpayCredentials, refundRazorpayPayment } from "@/lib/razorpay";
import { findPaymentAttemptByOrder, recordPaymentRefund } from "@/lib/payment-attempt-repository";
import { prisma } from "@/lib/prisma";

/** Issues or confirms a full refund for a rejected, captured service payment. */
export async function refundRejectedApplication(input: {
  paymentId?: string | null;
  orderId?: string | null;
  amountRupees: number;
  applicationReference: string;
}) {
  if (!input.paymentId || !Number.isFinite(input.amountRupees) || input.amountRupees <= 0) {
    return { refunded: false, reason: "No captured online payment was found for this application." };
  }

  const prior = input.orderId ? await findPaymentAttemptByOrder(input.orderId) : null;
  if (["REFUNDED", "PARTIALLY_REFUNDED"].includes(String(prior?.display_status || ""))) {
    return { refunded: true, refundId: prior?.refund_reference || "", status: prior?.refund_status || "processed" };
  }

  const credentials = getRazorpayCredentials();
  if (!credentials) throw new Error("Razorpay credentials are not configured; the application was not refunded.");
  const refund = await refundRazorpayPayment(
    credentials,
    input.paymentId,
    Math.round(input.amountRupees * 100),
    { applicationReference: input.applicationReference, reason: "Application rejected by staff" }
  );
  if (String(refund.status).toLowerCase() === "failed") {
    throw new Error("Razorpay declined the refund request. The application was not marked rejected; please retry or contact finance.");
  }
  const status = String(refund.status).toLowerCase() === "processed" ? "SUCCESSFUL" : "PROCESSING";
  await recordPaymentRefund({
    razorpayOrderId: input.orderId || undefined,
    razorpayPaymentId: input.paymentId,
    refundId: refund.id,
    amountRefunded: refund.amount / 100,
    isFullRefund: refund.amount >= Math.round(input.amountRupees * 100),
    reason: "Application rejected by staff",
    status,
  });
  return { refunded: true, refundId: refund.id, status: refund.status };
}

/** Returns a rejected service fee to the retailer wallet once per application. */
export async function refundRetailerWallet(input: {
  retailerId: number | string;
  amountRupees: number;
  applicationReference: string;
}) {
  if (!Number.isFinite(input.amountRupees) || input.amountRupees <= 0) return { refunded: false };
  const description = `Refund for rejected application ${input.applicationReference}`;
  return prisma.$transaction(async (tx) => {
    const existing = await tx.$queryRawUnsafe<any[]>(
      `SELECT id FROM retail_wallet_transactions WHERE retailer_id = ? AND type = 'credit' AND source_type = 'service_refund' AND description = ? LIMIT 1`,
      input.retailerId,
      description
    );
    if (existing.length) return { refunded: true, alreadyRefunded: true };

    await tx.$executeRawUnsafe(
      `UPDATE retail_users SET wallet_balance = wallet_balance + ? WHERE id = ?`,
      input.amountRupees,
      input.retailerId
    );
    await tx.$executeRawUnsafe(
      `INSERT INTO retail_wallet_transactions (retailer_id, type, amount, source_type, description, created_at)
       VALUES (?, 'credit', ?, 'service_refund', ?, NOW())`,
      input.retailerId,
      input.amountRupees,
      description
    );
    return { refunded: true, alreadyRefunded: false };
  });
}
