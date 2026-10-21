import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthRetailer } from "@/lib/auth-helpers";
import { ensureRetailerWalletRefundTable } from "@/lib/retailer-wallet-refunds";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const retailer = await getAuthRetailer(request);
  if (!retailer) return NextResponse.json({ ok: false, error: "Retailer sign-in required." }, { status: 401 });
  try {
    await ensureRetailerWalletRefundTable();
    const [requests, usage] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(
      `SELECT id, amount, reason, status, staff_note, requested_at, reviewed_at, reviewed_by, paid_at
       FROM retailer_wallet_refunds WHERE retailer_id = ? ORDER BY id DESC LIMIT 100`, retailer.id),
      prisma.$queryRawUnsafe<any[]>(
        `SELECT
           SUM(requested_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)) AS last_24_hours,
           SUM(requested_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS last_7_days,
           SUM(requested_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS last_30_days
         FROM retailer_wallet_refunds WHERE retailer_id = ?`, retailer.id),
    ]);
    return NextResponse.json({ ok: true, limits: { daily: 1, weekly: 3, monthly: 10, ...usage[0] }, requests: requests.map((row) => ({
      ...row,
      id: Number(row.id),
      amount: Number(row.amount),
      requested_at: row.requested_at ? new Date(row.requested_at).toISOString() : null,
      reviewed_at: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
      paid_at: row.paid_at ? new Date(row.paid_at).toISOString() : null,
    })) });
  } catch (error) {
    console.error("Retailer wallet refund history query failed:", error);
    return NextResponse.json({ ok: false, error: "Could not load refund requests. Please refresh or contact support." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const retailer = await getAuthRetailer(request);
  if (!retailer) return NextResponse.json({ ok: false, error: "Retailer sign-in required." }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount);
    const reasonType = typeof body.reasonType === "string" ? body.reasonType.trim() : "";
    const details = typeof body.reason === "string" ? body.reason.trim() : "";
    const allowedReasons = ["Excess wallet balance", "Account closure", "Incorrect top-up", "Services no longer needed", "Other"];
    const reason = `${reasonType}${details ? `: ${details}` : ""}`;
    if (!Number.isFinite(amount) || amount < 1 || amount > 5_000_000 || !allowedReasons.includes(reasonType) || reason.length > 500 || (reasonType === "Other" && details.length < 5)) {
      return NextResponse.json({ ok: false, error: "Enter an amount from ₹1 to ₹50,00,000 and select a valid reason. For Other, add at least 5 characters of detail." }, { status: 400 });
    }
    const refundAmount = Math.round(amount * 100) / 100;
    await ensureRetailerWalletRefundTable();
    const result = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<any[]>("SELECT id, wallet_balance FROM retail_users WHERE id = ? LIMIT 1 FOR UPDATE", retailer.id);
      const account = rows[0];
      const balance = Number(account?.wallet_balance || 0);
      if (!account || refundAmount > balance) throw new Error("Requested amount exceeds your available wallet balance.");
      const counts = await tx.$queryRawUnsafe<any[]>(
        `SELECT
           SUM(requested_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)) AS last_24_hours,
           SUM(requested_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS last_7_days,
           SUM(requested_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS last_30_days
         FROM retailer_wallet_refunds WHERE retailer_id = ?`, retailer.id);
      const used = counts[0] || {};
      if (Number(used.last_24_hours || 0) >= 1) throw new Error("Refund limit reached: one request is allowed per 24 hours.");
      if (Number(used.last_7_days || 0) >= 3) throw new Error("Refund limit reached: three requests are allowed per 7 days.");
      if (Number(used.last_30_days || 0) >= 10) throw new Error("Refund limit reached: ten requests are allowed per 30 days.");
      const debited = await tx.$executeRawUnsafe("UPDATE retail_users SET wallet_balance = wallet_balance - ? WHERE id = ? AND wallet_balance >= ?", refundAmount, retailer.id, refundAmount);
      if (Number(debited) !== 1) throw new Error("Wallet balance changed. Refresh the page and try again.");
      await tx.$executeRawUnsafe(
        `INSERT INTO retailer_wallet_refunds (retailer_id, amount, reason, status, requested_at)
         VALUES (?, ?, ?, 'REQUESTED', NOW())`, retailer.id, refundAmount, reason);
      const created = await tx.$queryRawUnsafe<any[]>("SELECT LAST_INSERT_ID() AS id");
      const requestId = Number(created[0]?.id);
      if (!Number.isSafeInteger(requestId) || requestId <= 0) throw new Error("Could not create refund request reference.");
      await tx.$executeRawUnsafe(
        `INSERT INTO retail_wallet_transactions (retailer_id, type, amount, source_type, description, created_at)
         VALUES (?, 'debit', ?, 'wallet_refund_hold', ?, NOW())`, retailer.id, refundAmount, `Wallet refund hold for request ${requestId}; payout pending staff review.`);
      return { amount: refundAmount, balance: balance - refundAmount };
    });
    return NextResponse.json({ ok: true, message: `Refund request for ₹${result.amount.toFixed(2)} submitted. The amount is held while staff reviews and arranges payout.`, availableBalance: result.balance });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not submit refund request.";
    const status = message.startsWith("Refund limit reached:") ? 429 : message.includes("available wallet balance") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
