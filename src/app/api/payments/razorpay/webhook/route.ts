import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  recordPaymentSuccess,
  recordPaymentFailure,
  recordPaymentRefund,
} from "@/lib/payment-attempt-repository";
import {
  normalizeErrorReason,
  maskPaymentMethod,
} from "@/lib/payment-status-service";

export const dynamic = "force-dynamic";

/**
 * Verifies Razorpay Webhook HMAC-SHA256 signature using the raw request text.
 */
function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  try {
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(String(signature), "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || process.env.RAZORPAY_KEY_SECRET?.trim();

    // Verify webhook cryptographic signature if secret configured
    if (webhookSecret && process.env.NODE_ENV !== "test") {
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        return NextResponse.json({ ok: false, error: "Invalid webhook signature" }, { status: 400 });
      }
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    const eventId = event.id || request.headers.get("x-razorpay-event-id") || `evt_${Date.now()}`;
    const eventType = event.event;

    // Idempotency check on webhook event: prevent duplicate executions
    const existingEvent = await prisma.$queryRawUnsafe<any[]>(
      "SELECT id FROM paymentlog WHERE signature = ? LIMIT 1",
      `webhook_event_${eventId}`
    ).catch(() => []);

    if (existingEvent && existingEvent.length > 0) {
      return NextResponse.json({ ok: true, duplicated: true, eventId });
    }

    // Process event types
    if (eventType === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      if (payment) {
        const orderId = payment.order_id;
        const paymentId = payment.id;
        const amountRs = Number(payment.amount || 0) / 100;
        const method = payment.method;

        // Fetch attempt
        const attempts = await prisma.$queryRawUnsafe<any[]>(
          "SELECT id, service_type, application_reference, receipt_no, display_status FROM payment_attempts WHERE razorpay_order_id = ? LIMIT 1",
          orderId
        ).catch(() => []);

        const attempt = attempts?.[0];
        const receiptNo = attempt?.receipt_no || `TN-RCP-${String(orderId).slice(-6)}`;
        const appRef = attempt?.application_reference || `TN-APP-2026-${String(orderId).slice(-6)}`;

        await recordPaymentSuccess({
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          applicationReference: appRef,
          receiptNo,
          paymentMethod: method,
          methodDetails: {
            cardLast4: payment.card?.last4,
            cardNetwork: payment.card?.network,
            bank: payment.bank,
            vpa: payment.vpa,
            wallet: payment.wallet,
          },
        });

        // Log processed event for idempotency
        await prisma.$executeRawUnsafe(
          `INSERT INTO paymentlog (id, serviceRequestId, gateway, orderId, paymentId, amount, status, signature, createdAt)
           VALUES (?, 'WEBHOOK', 'RAZORPAY', ?, ?, ?, 'SUCCESS', ?, NOW(3))`,
          crypto.randomUUID(),
          orderId || `order_${eventId}`,
          paymentId,
          amountRs,
          `webhook_event_${eventId}`
        ).catch(() => {});
      }
    } else if (eventType === "payment.failed") {
      const payment = event.payload?.payment?.entity;
      if (payment) {
        const orderId = payment.order_id;
        const paymentId = payment.id;
        const errorCode = payment.error_code;
        const errorReason = payment.error_reason;
        const errorDesc = payment.error_description;
        const errorSource = payment.error_source;
        const errorStep = payment.error_step;

        await recordPaymentFailure({
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          errorCode,
          errorReason,
          errorSource,
          errorStep,
          errorDescription: errorDesc,
          isCancelled: errorReason === "payment_cancelled",
          isTimedOut: errorReason === "payment_timed_out",
        });

        await prisma.$executeRawUnsafe(
          `INSERT INTO paymentlog (id, serviceRequestId, gateway, orderId, paymentId, amount, status, signature, createdAt)
           VALUES (?, 'WEBHOOK', 'RAZORPAY', ?, ?, ?, 'FAILED', ?, NOW(3))`,
          crypto.randomUUID(),
          orderId || `order_${eventId}`,
          paymentId,
          Number(payment.amount || 0) / 100,
          `webhook_event_${eventId}`
        ).catch(() => {});
      }
    } else if (eventType === "payment.authorized") {
      const payment = event.payload?.payment?.entity;
      if (payment) {
        const orderId = payment.order_id;
        const paymentId = payment.id;

        // Mark AUTHORIZED (never treat as captured!)
        await prisma.$executeRawUnsafe(
          `UPDATE payment_attempts 
           SET display_status = 'AUTHORIZED', razorpay_status = 'authorized', razorpay_payment_id = ?, updated_at = NOW() 
           WHERE razorpay_order_id = ?`,
          paymentId,
          orderId
        ).catch(() => {});
      }
    } else if (eventType === "refund.processed" || eventType === "refund.created") {
      const refund = event.payload?.refund?.entity;
      if (refund) {
        const paymentId = refund.payment_id;
        const refundAmountRs = Number(refund.amount || 0) / 100;
        const refundId = refund.id;

        // Check if full refund
        const payments = await prisma.$queryRawUnsafe<any[]>(
          "SELECT amount FROM payment_attempts WHERE razorpay_payment_id = ? LIMIT 1",
          paymentId
        ).catch(() => []);

        const totalAmount = Number(payments?.[0]?.amount || 0);
        const isFull = totalAmount > 0 && refundAmountRs >= totalAmount;

        await recordPaymentRefund({
          razorpayPaymentId: paymentId,
          refundId,
          amountRefunded: refundAmountRs,
          isFullRefund: isFull,
          status: eventType === "refund.processed" ? "SUCCESSFUL" : "PROCESSING",
        });
      }
    }

    return NextResponse.json({ ok: true, eventId, eventType });
  } catch (err: any) {
    console.error("POST /api/payments/razorpay/webhook error:", err);
    return NextResponse.json({ ok: false, error: "Webhook processing error" }, { status: 500 });
  }
}
