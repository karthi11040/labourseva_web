import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCitizenIdentity } from "@/lib/auth-helpers";
import { getRazorpayCredentials } from "@/lib/razorpay";
import {
  DISPLAY_STATUSES,
  normalizeErrorReason,
  resolveDisplayStatus,
  maskPaymentMethod,
} from "@/lib/payment-status-service";
import { recordPaymentSuccess, recordPaymentFailure } from "@/lib/payment-attempt-repository";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const me = await getCitizenIdentity(request);
    if (!me) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { razorpayOrderId, razorpayPaymentId } = body;

    if (!razorpayOrderId && !razorpayPaymentId) {
      return NextResponse.json({ ok: false, error: "Order ID or Payment ID is required" }, { status: 400 });
    }

    const userDbId = Number(me.customerId || 0);

    // Fetch existing attempt
    const attempts = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM payment_attempts 
       WHERE razorpay_order_id = ? OR razorpay_payment_id = ? 
       LIMIT 1`,
      razorpayOrderId || "",
      razorpayPaymentId || ""
    ).catch(() => []);

    if (!attempts || attempts.length === 0) {
      return NextResponse.json({ ok: false, error: "Payment attempt not found" }, { status: 404 });
    }

    const attempt = attempts[0];
    if (attempt.user_id && attempt.user_id !== userDbId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // If already marked successful and verified, return current state
    if (attempt.display_status === "SUCCESSFUL" && attempt.captured_at) {
      return NextResponse.json({
        ok: true,
        displayStatus: "SUCCESSFUL",
        statusLabel: DISPLAY_STATUSES.SUCCESSFUL.label,
        statusMessage: DISPLAY_STATUSES.SUCCESSFUL.message,
        razorpayStatus: "captured",
        canRetry: false,
        canDownloadReceipt: true,
      });
    }

    // Reconcile with Razorpay Gateway
    const creds = getRazorpayCredentials();
    if (!creds) {
      // In sandbox/offline mode without live keys, return safe status
      const isStillPending = attempt.display_status === "INITIATED" || attempt.display_status === "PENDING";
      const displayStatus = isStillPending ? "VERIFICATION_PENDING" : attempt.display_status;
      const meta = DISPLAY_STATUSES[displayStatus as keyof typeof DISPLAY_STATUSES] || DISPLAY_STATUSES.VERIFICATION_PENDING;

      return NextResponse.json({
        ok: true,
        displayStatus,
        statusLabel: meta.label,
        statusMessage: meta.message,
        razorpayStatus: attempt.razorpay_status,
        canRetry: displayStatus === "FAILED" || displayStatus === "CANCELLED" || displayStatus === "TIMED_OUT",
        canDownloadReceipt: displayStatus === "SUCCESSFUL",
      });
    }

    // Call Razorpay API to fetch authoritative payments for order
    let paymentsList: any[] = [];
    try {
      const orderIdToFetch = attempt.razorpay_order_id || razorpayOrderId;
      const res = await fetch(`${creds.apiBase}/orders/${orderIdToFetch}/payments`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString("base64")}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        paymentsList = data.items || [];
      }
    } catch (fetchErr) {
      console.warn("[Razorpay Reconciliation Fetch Error]:", fetchErr);
    }

    // Analyze gateway payments
    const capturedPayment = paymentsList.find((p) => p.status === "captured");
    const authorizedPayment = paymentsList.find((p) => p.status === "authorized");
    const failedPayment = paymentsList.find((p) => p.status === "failed");

    if (capturedPayment) {
      // Payment was indeed captured at gateway!
      const receiptNo = attempt.receipt_no || `TN-RCP-${attempt.service_type === "DOCUMENT_SERVICE" ? "DOC" : "ES"}-${String(attempt.id).padStart(6, "0")}`;
      const appRef = attempt.application_reference || `TN-${attempt.service_type === "DOCUMENT_SERVICE" ? "DOC" : "ES"}-2026-${String(attempt.id).padStart(6, "0")}`;

      await recordPaymentSuccess({
        razorpayOrderId: attempt.razorpay_order_id,
        razorpayPaymentId: capturedPayment.id,
        applicationReference: appRef,
        receiptNo,
        paymentMethod: capturedPayment.method,
        methodDetails: {
          cardLast4: capturedPayment.card?.last4,
          cardNetwork: capturedPayment.card?.network,
          bank: capturedPayment.bank,
          vpa: capturedPayment.vpa,
          wallet: capturedPayment.wallet,
        },
      });

      return NextResponse.json({
        ok: true,
        displayStatus: "SUCCESSFUL",
        statusLabel: DISPLAY_STATUSES.SUCCESSFUL.label,
        statusMessage: DISPLAY_STATUSES.SUCCESSFUL.message,
        razorpayStatus: "captured",
        receiptNo,
        applicationReference: appRef,
        canRetry: false,
        canDownloadReceipt: true,
      });
    }

    if (authorizedPayment) {
      await prisma.$executeRawUnsafe(
        `UPDATE payment_attempts 
         SET display_status = 'AUTHORIZED', razorpay_status = 'authorized', razorpay_payment_id = ?, updated_at = NOW() 
         WHERE id = ?`,
        authorizedPayment.id,
        attempt.id
      );

      return NextResponse.json({
        ok: true,
        displayStatus: "AUTHORIZED",
        statusLabel: DISPLAY_STATUSES.AUTHORIZED.label,
        statusMessage: DISPLAY_STATUSES.AUTHORIZED.message,
        razorpayStatus: "authorized",
        canRetry: false,
        canDownloadReceipt: false,
      });
    }

    if (failedPayment) {
      const normalized = normalizeErrorReason(
        failedPayment.error_reason,
        failedPayment.error_code,
        failedPayment.error_description
      );

      await recordPaymentFailure({
        razorpayOrderId: attempt.razorpay_order_id,
        razorpayPaymentId: failedPayment.id,
        errorCode: failedPayment.error_code,
        errorReason: failedPayment.error_reason,
        errorSource: failedPayment.error_source,
        errorStep: failedPayment.error_step,
        errorDescription: failedPayment.error_description,
      });

      return NextResponse.json({
        ok: true,
        displayStatus: "FAILED",
        statusLabel: DISPLAY_STATUSES.FAILED.label,
        statusMessage: normalized.userMessage,
        suggestedAction: normalized.suggestedAction,
        errorReason: normalized.reasonCode,
        razorpayStatus: "failed",
        canRetry: true,
        canDownloadReceipt: false,
      });
    }

    // No payments recorded yet
    const createdTime = new Date(attempt.created_at).getTime();
    const isOld = Date.now() - createdTime > 30 * 60 * 1000; // > 30 minutes
    const resolvedStatus = isOld ? "TIMED_OUT" : "PENDING";
    const meta = DISPLAY_STATUSES[resolvedStatus];

    if (isOld && attempt.display_status === "INITIATED") {
      await prisma.$executeRawUnsafe(
        `UPDATE payment_attempts 
         SET display_status = 'TIMED_OUT', razorpay_status = 'timed_out', status_message = ?, updated_at = NOW() 
         WHERE id = ?`,
        meta.message,
        attempt.id
      );
    }

    return NextResponse.json({
      ok: true,
      displayStatus: resolvedStatus,
      statusLabel: meta.label,
      statusMessage: meta.message,
      razorpayStatus: isOld ? "timed_out" : attempt.razorpay_status,
      canRetry: isOld,
      canDownloadReceipt: false,
    });
  } catch (err: any) {
    console.error("POST /api/payments/razorpay/reconcile error:", err);
    return NextResponse.json({ ok: false, error: "Failed to reconcile payment status" }, { status: 500 });
  }
}
