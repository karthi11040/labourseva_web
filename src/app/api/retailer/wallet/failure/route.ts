import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthRetailer } from "@/lib/auth-helpers";
import { recordPaymentFailure } from "@/lib/payment-attempt-repository";
import { dispatchRetailerWalletFailureNotification } from "@/lib/notification-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const retailer = await getAuthRetailer(request);
    if (!retailer) {
      return NextResponse.json({ ok: false, error: "Unauthorized Kendra session" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      razorpayOrderId,
      razorpayPaymentId,
      error,
      isCancelled,
      isTimedOut,
      amount,
    } = body;

    const numAmount = Number(amount || 0);

    // 1. Record failure in payment_attempts repository if orderId is provided
    if (razorpayOrderId) {
      try {
        const errorCode = error?.code || (isCancelled ? "PAYMENT_CANCELLED" : isTimedOut ? "PAYMENT_TIMED_OUT" : "PAYMENT_FAILED");
        const errorReason = error?.reason || (isCancelled ? "payment_cancelled" : isTimedOut ? "payment_timed_out" : null);
        const errorDescription = error?.description || (isCancelled ? "Payment was cancelled before completion." : isTimedOut ? "Payment session timed out." : "Transaction could not be completed.");

        await recordPaymentFailure({
          razorpayOrderId,
          razorpayPaymentId,
          errorCode,
          errorReason,
          errorSource: error?.source || "gateway",
          errorStep: error?.step || "payment_authentication",
          errorDescription,
          isCancelled: Boolean(isCancelled),
          isTimedOut: Boolean(isTimedOut),
        });
      } catch (repoErr) {
        console.warn("[Wallet Failure Repository Log Warning]:", repoErr);
      }
    }

    // 2. Dispatch failure notification email to retailer profile email
    const reasonText = error?.description || (isCancelled ? "Payment was cancelled by operator." : isTimedOut ? "Payment gateway session timed out." : "Transaction declined by bank or aggregator.");
    const errorCode = error?.code || (isCancelled ? "OPERATOR_CANCELLED" : "GATEWAY_DECLINED");

    if (retailer.email) {
      try {
        await dispatchRetailerWalletFailureNotification({
          retailerId: retailer.id,
          name: retailer.name || retailer.shop_name || "Kendra Operator",
          shopName: retailer.shop_name,
          registrationNo: retailer.registration_no,
          email: retailer.email,
          phone: retailer.phone,
          amount: numAmount,
          orderId: razorpayOrderId,
          paymentId: razorpayPaymentId,
          reason: reasonText,
          errorCode,
          date: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
        });
      } catch (mailErr) {
        console.warn("[Wallet Failure Email Dispatch Warning]:", mailErr);
      }
    }

    return NextResponse.json({
      ok: true,
      status: isCancelled ? "CANCELLED" : "FAILED",
      reason: reasonText,
      emailNotified: Boolean(retailer.email),
    });
  } catch (err: any) {
    console.error("POST /api/retailer/wallet/failure error:", err);
    return NextResponse.json({ ok: false, error: err.message || "Failed to process failure outcome" }, { status: 500 });
  }
}
