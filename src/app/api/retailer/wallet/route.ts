import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthRetailer } from "@/lib/auth-helpers";
import { ensurePaymentAttemptColumns } from "@/lib/payment-db-sync";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const retailer = await getAuthRetailer(request);
    if (!retailer) {
      return NextResponse.json({ ok: false, error: "Unauthorized Kendra session" }, { status: 401 });
    }

    // 1. Fresh balance
    const retRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT ru.id, ru.wallet_balance, ru.shop_name, ru.registration_no, ru.distributor_id, d.name AS distributor_name, d.phone AS distributor_phone
       FROM retail_users ru
       LEFT JOIN distributors d ON ru.distributor_id = d.id
       WHERE ru.id = ? LIMIT 1`,
      retailer.id
    );
    const ret = retRows[0] || retailer;

    // 2. Transactions ledger
    const transactions = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, type, amount, source_type, description, created_at
       FROM retail_wallet_transactions
       WHERE retailer_id = ?
       ORDER BY id DESC
       LIMIT 100`,
      retailer.id
    ).catch(() => []);

    // The wallet ledger only contains settled credits/debits. Keep gateway
    // attempts here too so failed, cancelled, and pending payments are visible.
    const paymentAttempts = await ensurePaymentAttemptColumns().then(() =>
      prisma.$queryRawUnsafe<any[]>(
        `SELECT id, amount, service_name, display_status, status_message,
                razorpay_payment_id, razorpay_order_id, created_at
         FROM payment_attempts
         WHERE user_type = 'retailer' AND user_id = ?
         ORDER BY id DESC LIMIT 100`,
        retailer.id
      )
    ).catch(() => []);

    const recordedPaymentIds = new Set(
      transactions.map((t) => t.description?.match(/Payment ID:\s*([^,\s]+)/i)?.[1]).filter(Boolean)
    );
    const ledgerRows = transactions.map((t) => ({
      id: `wallet-${t.id}`,
      type: t.type,
      amount: Number(t.amount || 0),
      sourceType: t.source_type,
      description: t.description,
      status: t.type === "credit" ? "SUCCESSFUL" : "COMPLETED",
      createdAt: t.created_at,
      receiptUrl: t.type === "credit" ? `/api/retailer/wallet/receipt?id=${t.id}` : null,
    }));
    const attemptRows = paymentAttempts
      .filter((t) => !(t.display_status === "SUCCESSFUL" && t.razorpay_payment_id && recordedPaymentIds.has(t.razorpay_payment_id)))
      .map((t) => ({
        id: `payment-${t.id}`,
        type: "payment",
        amount: Number(t.amount || 0),
        sourceType: "RAZORPAY",
        description: t.service_name || t.status_message || "Payment",
        status: t.display_status || "INITIATED",
        createdAt: t.created_at,
        receiptUrl: t.display_status === "SUCCESSFUL" && t.razorpay_payment_id
          ? `/api/retailer/wallet/receipt?paymentId=${encodeURIComponent(t.razorpay_payment_id)}`
          : null,
      }));
    const history = [...ledgerRows, ...attemptRows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 3. Aggregate totals
    let totalCredited = 0;
    let totalDebited = 0;
    for (const t of transactions) {
      const amt = Number(t.amount || 0);
      if (t.type === "credit") totalCredited += amt;
      else if (t.type === "debit") totalDebited += amt;
    }

    return NextResponse.json({
      ok: true,
      walletBalance: Number(ret.wallet_balance || 0),
      totalCredited,
      totalDebited,
      retailer: {
        id: ret.id,
        shopName: ret.shop_name || "Authorized Kendra",
        registrationNo: ret.registration_no || `RET-${ret.id}`,
        phone: ret.phone || "",
      },
      distributor: {
        id: ret.distributor_id,
        name: ret.distributor_name || "Assigned Territory Distributor",
        phone: ret.distributor_phone || "-",
      },
      transactions: history,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

