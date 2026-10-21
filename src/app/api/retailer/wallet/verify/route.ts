import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthRetailer } from "@/lib/auth-helpers";
import { getRazorpayCredentials, getRazorpayEnv, verifyRazorpaySignature } from "@/lib/razorpay";
import { recordPaymentSuccess, recordPaymentFailure } from "@/lib/payment-attempt-repository";
import { generateReceiptPdf, ReceiptData } from "@/lib/generateReceiptPdf";
import {
  dispatchRetailerWalletSuccessNotification,
  dispatchRetailerWalletFailureNotification,
} from "@/lib/notification-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const retailer = await getAuthRetailer(request);
    if (!retailer) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized Kendra session. Please sign in." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, amount } = body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return NextResponse.json(
        { ok: false, error: "Invalid top-up transaction amount." },
        { status: 400 }
      );
    }

    if (!razorpayPaymentId) {
      return NextResponse.json(
        { ok: false, error: "Missing Razorpay payment ID." },
        { status: 400 }
      );
    }

    const creds = getRazorpayCredentials();
    const env = getRazorpayEnv();

    // 1. Signature Verification
    const isMockTestPayment =
      env === "test" &&
      typeof razorpayPaymentId === "string" &&
      razorpayPaymentId.startsWith("pay_test_");

    if (!isMockTestPayment) {
      if (!creds?.keySecret) {
        return NextResponse.json(
          { ok: false, error: "Razorpay credentials not configured on server." },
          { status: 500 }
        );
      }
      if (!razorpayOrderId || !razorpaySignature) {
        return NextResponse.json(
          { ok: false, error: "Missing Razorpay order ID or signature." },
          { status: 400 }
        );
      }

      const isValid = verifyRazorpaySignature(
        creds.keySecret,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      );

      if (!isValid) {
        // Record failure and send failure mail
        if (razorpayOrderId) {
          recordPaymentFailure({
            razorpayOrderId,
            razorpayPaymentId,
            errorCode: "BAD_SIGNATURE",
            errorReason: "Signature verification failed",
            errorDescription: "Payment signature could not be verified by server.",
          }).catch(() => {});
        }
        if (retailer.email) {
          dispatchRetailerWalletFailureNotification({
            retailerId: retailer.id,
            name: retailer.name || retailer.shop_name || "Kendra Operator",
            shopName: retailer.shop_name,
            registrationNo: retailer.registration_no,
            email: retailer.email,
            phone: retailer.phone,
            amount: numAmount,
            orderId: razorpayOrderId,
            paymentId: razorpayPaymentId,
            reason: "Invalid cryptographic payment signature received from gateway.",
            errorCode: "BAD_SIGNATURE",
          }).catch(() => {});
        }

        return NextResponse.json(
          { ok: false, error: "Invalid payment signature verification failed." },
          { status: 400 }
        );
      }
    }

    // 2. Idempotency Check: Avoid double credit if user or gateway retried
    const existing = await prisma.$queryRawUnsafe<any[]>(
      "SELECT id, amount, created_at FROM retail_wallet_transactions WHERE description LIKE ? AND retailer_id = ? LIMIT 1",
      `%${razorpayPaymentId}%`,
      retailer.id
    ).catch(() => []);

    if (existing && existing.length > 0) {
      const current = await prisma.$queryRawUnsafe<any[]>(
        "SELECT wallet_balance FROM retail_users WHERE id = ? LIMIT 1",
        retailer.id
      );
      const receiptNo = `RCT-RET-${String(existing[0].id).padStart(6, "0")}`;
      return NextResponse.json({
        ok: true,
        message: "Payment was already verified and credited to your Kendra wallet.",
        newBalance: Number(current[0]?.wallet_balance || 0),
        paymentId: razorpayPaymentId,
        orderId: razorpayOrderId,
        receiptNo,
        receiptUrl: `/api/retailer/wallet/receipt?paymentId=${encodeURIComponent(razorpayPaymentId)}`,
        duplicate: true,
      });
    }

    // 3. Credit the Kendra wallet in database
    await prisma.$executeRawUnsafe(
      "UPDATE retail_users SET wallet_balance = wallet_balance + ? WHERE id = ?",
      numAmount,
      retailer.id
    );

    // 4. Record row in retail_wallet_transactions ledger
    const description = `Kendra Wallet Top-up via Razorpay Instant Gateway. Payment ID: ${razorpayPaymentId}, Order: ${razorpayOrderId || "N/A"}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO retail_wallet_transactions (retailer_id, type, amount, source_type, description, created_at)
       VALUES (?, 'credit', ?, 'topup', ?, NOW())`,
      retailer.id,
      numAmount,
      description
    );

    // 5. Fetch updated balance and newly inserted transaction
    const updated = await prisma.$queryRawUnsafe<any[]>(
      "SELECT wallet_balance FROM retail_users WHERE id = ? LIMIT 1",
      retailer.id
    );
    const newBalance = Number(updated[0]?.wallet_balance || 0);

    const insertedTx = await prisma.$queryRawUnsafe<any[]>(
      "SELECT id, created_at FROM retail_wallet_transactions WHERE description LIKE ? AND retailer_id = ? ORDER BY id DESC LIMIT 1",
      `%${razorpayPaymentId}%`,
      retailer.id
    ).catch(() => []);

    const txnId = insertedTx?.[0]?.id || Date.now();
    const receiptNo = `RCT-RET-${String(txnId).padStart(6, "0")}`;
    const txCreatedAt = insertedTx?.[0]?.created_at || new Date().toISOString();

    // 6. Record success in payment_attempts repository
    if (razorpayOrderId) {
      recordPaymentSuccess({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        applicationReference: `KENDRA-TOPUP-${txnId}`,
        receiptNo,
        paymentMethod: "UPI / Razorpay",
      }).catch((err) => {
        console.warn("[Wallet Success Repository Log Warning]:", err);
      });
    }

    // 7. Generate PDF receipt buffer
    let receiptPdfBuffer: Buffer | undefined;
    try {
      const receiptData: ReceiptData = {
        receiptNo,
        paymentReference: razorpayPaymentId,
        applicationReference: `KENDRA-TOPUP-${txnId}`,
        serviceType: "DOCUMENT_SERVICE",
        categoryName: "Kendra Prepaid Account",
        serviceName: "Kendra Wallet Balance Recharge",
        customerName: `${retailer.shop_name || retailer.name || "Kendra Operator"} (${retailer.registration_no || `RET-${retailer.id}`})`,
        customerPhone: retailer.phone || "",
        customerEmail: retailer.email || "",
        customerId: retailer.registration_no || `RET-${retailer.id}`,
        amount: numAmount,
        subtotal: numAmount,
        totalAmount: numAmount,
        currency: "INR",
        paymentProvider: "RAZORPAY",
        paymentMethod: "UPI / Instant Gateway",
        razorpayOrderId,
        razorpayPaymentId,
        paymentStatus: "SUCCESS",
        paymentDate: new Date(txCreatedAt).toISOString(),
        receiptDate: new Date(txCreatedAt).toLocaleDateString("en-IN"),
        organizationName: "Labour Welfare Department · Govt of Tamil Nadu",
      };

      const pdfBytes = await generateReceiptPdf(receiptData);
      receiptPdfBuffer = Buffer.from(pdfBytes);
    } catch (pdfErr) {
      console.warn("[Wallet Receipt PDF Generation Warning]:", pdfErr);
    }

    // 8. Dispatch Success Receipt Email to Retailer Profile Email (with PDF attached)
    if (retailer.email) {
      dispatchRetailerWalletSuccessNotification({
        retailerId: retailer.id,
        name: retailer.name || retailer.shop_name || "Kendra Operator",
        shopName: retailer.shop_name,
        registrationNo: retailer.registration_no,
        email: retailer.email,
        phone: retailer.phone,
        amount: numAmount,
        newBalance,
        paymentId: razorpayPaymentId,
        orderId: razorpayOrderId,
        receiptNo,
        pdfBuffer: receiptPdfBuffer,
        date: new Date(txCreatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
      }).catch((mailErr) => {
        console.warn("[Wallet Success Email Dispatch Warning]:", mailErr);
      });
    }

    return NextResponse.json({
      ok: true,
      message: `Payment successful! ₹${numAmount.toFixed(2)} has been credited to your Kendra wallet.`,
      newBalance,
      paymentId: razorpayPaymentId,
      orderId: razorpayOrderId,
      creditedAmount: numAmount,
      receiptNo,
      txnId,
      receiptUrl: `/api/retailer/wallet/receipt?paymentId=${encodeURIComponent(razorpayPaymentId)}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to verify and process wallet top-up." },
      { status: 500 }
    );
  }
}
