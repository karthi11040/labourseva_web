import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { adminSessionCookieName, isAdminSession } from "@/lib/admin-session";
import { recordPaymentSuccess, recordPaymentFailure } from "@/lib/payment-attempt-repository";
import { generateReceiptPdf, ReceiptData } from "@/lib/generateReceiptPdf";
import {
  dispatchRetailerWalletSuccessNotification,
  dispatchRetailerWalletFailureNotification,
} from "@/lib/notification-service";

export const dynamic = "force-dynamic";

async function isAuthorizedAdmin(request?: Request): Promise<boolean> {
  let adminVal: string | undefined;
  if (request) {
    const cookieHeader = request.headers.get("cookie") || "";
    for (const part of cookieHeader.split(";")) {
      const [k, v] = part.trim().split("=");
      if (k === adminSessionCookieName) {
        adminVal = decodeURIComponent(v || "");
        break;
      }
    }
  }
  if (!adminVal) {
    try {
      const cookieStore = await cookies();
      adminVal = cookieStore.get(adminSessionCookieName)?.value;
    } catch {
      return false;
    }
  }
  return isAdminSession(adminVal);
}

export async function GET(request: NextRequest) {
  try {
    if (!(await isAuthorizedAdmin(request))) {
      return NextResponse.json({ ok: false, error: "Administrator authorization required" }, { status: 401 });
    }

    const attempts = await prisma.$queryRawUnsafe<any[]>(
      `SELECT pa.id, pa.reference_id, pa.user_id, pa.user_type, pa.amount, pa.display_status,
              pa.razorpay_order_id, pa.razorpay_payment_id, pa.created_at,
              ru.name AS retailer_name, ru.shop_name, ru.registration_no, ru.email AS retailer_email, ru.phone AS retailer_phone
       FROM payment_attempts pa
       LEFT JOIN retail_users ru ON pa.user_id = ru.id
       WHERE pa.display_status IN ('INITIATED', 'PENDING')
       ORDER BY pa.id DESC
       LIMIT 50`
    ).catch(() => []);

    const mapped = attempts.map((a: any) => ({
      id: `PTXN-${a.id}`,
      orderRef: a.razorpay_order_id || a.reference_id || `REF-${a.id}`,
      partyName: a.shop_name || a.retailer_name || `Kendra #${a.user_id}`,
      partyType: (a.user_type === "retailer" ? "RETAILER" : "CITIZEN") as "RETAILER" | "CITIZEN",
      gateway: "RAZORPAY_UPI" as const,
      utrRef: a.razorpay_payment_id || "Awaiting Gateway Capture",
      amount: Number(a.amount || 0),
      walletTarget: "PAYMENTS" as const,
      submittedAt: a.created_at ? new Date(a.created_at).toLocaleString("en-IN") : "Recent",
      gatewayStatus: "PENDING_WEBHOOK" as const,
      status: "PENDING_VERIFICATION" as const,
      userId: a.user_id,
      email: a.retailer_email,
      phone: a.retailer_phone,
      regNo: a.registration_no,
    }));

    return NextResponse.json({ ok: true, txns: mapped });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthorizedAdmin(request))) {
      return NextResponse.json({ ok: false, error: "Administrator authorization required" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, txnId, orderRef, remarks } = body;

    const rawId = String(txnId || "").replace("PTXN-", "");
    const attemptRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT pa.*, ru.name AS retailer_name, ru.shop_name, ru.registration_no, ru.email AS retailer_email, ru.phone AS retailer_phone, ru.wallet_balance
       FROM payment_attempts pa
       LEFT JOIN retail_users ru ON pa.user_id = ru.id
       WHERE pa.id = ? OR pa.razorpay_order_id = ?
       LIMIT 1`,
      Number(rawId) || 0,
      orderRef || ""
    ).catch(() => []);

    if (!attemptRows || attemptRows.length === 0) {
      return NextResponse.json({ ok: false, error: "Pending transaction attempt not found." }, { status: 404 });
    }

    const attempt = attemptRows[0];
    const numAmount = Number(attempt.amount || 0);
    const userId = Number(attempt.user_id);
    const orderId = attempt.razorpay_order_id || `ORDER-${attempt.id}`;
    const paymentId = attempt.razorpay_payment_id || `PAY-ADM-${Date.now()}`;

    if (action === "APPROVE") {
      // 1. Credit retailer wallet
      await prisma.$executeRawUnsafe(
        "UPDATE retail_users SET wallet_balance = wallet_balance + ? WHERE id = ?",
        numAmount,
        userId
      );

      // 2. Insert into ledger
      const description = `Kendra Wallet Top-up approved by Administrator. Ref: ${orderId}, Manual Pay ID: ${paymentId}. Note: ${remarks || "Administrative clearance"}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO retail_wallet_transactions (retailer_id, type, amount, source_type, description, created_at)
         VALUES (?, 'credit', ?, 'topup', ?, NOW())`,
        userId,
        numAmount,
        description
      );

      // 3. Fetch new balance & transaction ID
      const updatedUser = await prisma.$queryRawUnsafe<any[]>(
        "SELECT wallet_balance FROM retail_users WHERE id = ? LIMIT 1",
        userId
      );
      const newBalance = Number(updatedUser[0]?.wallet_balance || 0);

      const insertedTx = await prisma.$queryRawUnsafe<any[]>(
        "SELECT id, created_at FROM retail_wallet_transactions WHERE description LIKE ? AND retailer_id = ? ORDER BY id DESC LIMIT 1",
        `%${orderId}%`,
        userId
      ).catch(() => []);

      const ledgerTxnId = insertedTx?.[0]?.id || Date.now();
      const receiptNo = `RCT-RET-${String(ledgerTxnId).padStart(6, "0")}`;

      // 4. Update payment attempt
      await recordPaymentSuccess({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        applicationReference: `KENDRA-TOPUP-${ledgerTxnId}`,
        receiptNo,
        paymentMethod: "Admin Approved Settlement",
      }).catch(() => {});

      // 5. Generate PDF receipt
      let pdfBuffer: Buffer | undefined;
      try {
        const receiptData: ReceiptData = {
          receiptNo,
          paymentReference: paymentId,
          applicationReference: `KENDRA-TOPUP-${ledgerTxnId}`,
          serviceType: "DOCUMENT_SERVICE",
          categoryName: "Kendra Prepaid Account",
          serviceName: "Kendra Wallet Balance Recharge",
          customerName: `${attempt.shop_name || attempt.retailer_name || "Kendra Operator"} (${attempt.registration_no || `RET-${userId}`})`,
          customerPhone: attempt.retailer_phone || "",
          customerEmail: attempt.retailer_email || "",
          customerId: attempt.registration_no || `RET-${userId}`,
          amount: numAmount,
          subtotal: numAmount,
          totalAmount: numAmount,
          currency: "INR",
          paymentProvider: "ADMIN_TREASURY",
          paymentMethod: "Admin Verified Top-Up",
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          paymentStatus: "SUCCESS",
          paymentDate: new Date().toISOString(),
          receiptDate: new Date().toLocaleDateString("en-IN"),
          organizationName: "Labour Welfare Department · Govt of Tamil Nadu",
        };

        const pdfBytes = await generateReceiptPdf(receiptData);
        pdfBuffer = Buffer.from(pdfBytes);
      } catch (pdfErr) {
        console.warn("[Admin Approved Receipt PDF Error]:", pdfErr);
      }

      // 6. Send success email with receipt attached to retailer profile email
      if (attempt.retailer_email) {
        dispatchRetailerWalletSuccessNotification({
          retailerId: userId,
          name: attempt.retailer_name || attempt.shop_name || "Kendra Operator",
          shopName: attempt.shop_name,
          registrationNo: attempt.registration_no,
          email: attempt.retailer_email,
          phone: attempt.retailer_phone,
          amount: numAmount,
          newBalance,
          paymentId,
          orderId,
          receiptNo,
          pdfBuffer,
          date: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
        }).catch((err) => {
          console.warn("[Admin Approve Email Dispatch Error]:", err);
        });
      }

      return NextResponse.json({
        ok: true,
        message: `Transaction approved. ₹${numAmount.toFixed(2)} credited to ${attempt.shop_name || "Kendra"} wallet.`,
        newBalance,
        receiptNo,
      });
    } else if (action === "REJECT") {
      await recordPaymentFailure({
        razorpayOrderId: orderId,
        errorCode: "ADMIN_REJECTED",
        errorReason: "Declined by administrator",
        errorDescription: remarks || "The pending transaction was rejected during administrative audit.",
      }).catch(() => {});

      if (attempt.retailer_email) {
        dispatchRetailerWalletFailureNotification({
          retailerId: userId,
          name: attempt.retailer_name || attempt.shop_name || "Kendra Operator",
          shopName: attempt.shop_name,
          registrationNo: attempt.registration_no,
          email: attempt.retailer_email,
          amount: numAmount,
          reason: remarks || "Transaction rejected during administrative verification.",
          orderId,
        }).catch(() => {});
      }

      return NextResponse.json({
        ok: true,
        message: "Transaction marked as rejected and failure notification dispatched.",
      });
    }

    return NextResponse.json({ ok: false, error: "Invalid action specified" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
