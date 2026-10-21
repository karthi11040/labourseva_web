import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCitizenIdentity } from "@/lib/auth-helpers";
import { recordPaymentFailure } from "@/lib/payment-attempt-repository";
import { normalizeErrorReason, DISPLAY_STATUSES } from "@/lib/payment-status-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const me = await getCitizenIdentity(request);
    if (!me) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const {
      razorpayOrderId,
      razorpayPaymentId,
      error,
      isCancelled,
      isTimedOut,
    } = body;

    if (!razorpayOrderId) {
      return NextResponse.json({ ok: false, error: "Order ID is required" }, { status: 400 });
    }

    // Verify ownership: order belongs to this authenticated citizen
    const userDbId = Number(me.customerId || 0);
    const existing = await prisma.$queryRawUnsafe<any[]>(
      "SELECT id, user_id, amount, display_status FROM payment_attempts WHERE razorpay_order_id = ? LIMIT 1",
      razorpayOrderId
    ).catch(() => []);

    if (existing && existing.length > 0) {
      const attempt = existing[0];
      if (attempt.user_id && attempt.user_id !== userDbId) {
        return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
      }

      // If already captured and confirmed, do not overwrite success!
      if (attempt.display_status === "SUCCESSFUL") {
        return NextResponse.json({
          ok: true,
          message: "Payment is already marked successful.",
          displayStatus: "SUCCESSFUL",
        });
      }
    }

    // Extract error fields
    const errorCode = error?.code || (isCancelled ? "PAYMENT_CANCELLED" : isTimedOut ? "PAYMENT_TIMED_OUT" : "PAYMENT_FAILED");
    const errorReason = error?.reason || (isCancelled ? "payment_cancelled" : isTimedOut ? "payment_timed_out" : null);
    const errorSource = error?.source || "gateway";
    const errorStep = error?.step || "payment_authentication";
    const errorDescription = error?.description || (isCancelled ? "The payment was cancelled before completion." : isTimedOut ? "The payment session timed out before completion." : "Payment could not be completed.");

    await recordPaymentFailure({
      razorpayOrderId,
      razorpayPaymentId,
      errorCode,
      errorReason,
      errorSource,
      errorStep,
      errorDescription,
      isCancelled: Boolean(isCancelled),
      isTimedOut: Boolean(isTimedOut),
    });

    const normalized = normalizeErrorReason(errorReason, errorCode, errorDescription);
    const finalDisplayStatus = isCancelled ? "CANCELLED" : isTimedOut ? "TIMED_OUT" : "FAILED";
    const meta = DISPLAY_STATUSES[finalDisplayStatus];

    return NextResponse.json({
      ok: true,
      displayStatus: finalDisplayStatus,
      statusLabel: meta.label,
      statusMessage: isCancelled ? meta.message : normalized.userMessage,
      suggestedAction: isCancelled ? "Retry the payment when you are ready." : normalized.suggestedAction,
      errorReason: normalized.reasonCode,
    });
  } catch (err: any) {
    console.error("POST /api/payments/razorpay/failure error:", err);
    return NextResponse.json({ ok: false, error: "Failed to record payment outcome" }, { status: 500 });
  }
}
