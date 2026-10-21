import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { adminSessionCookieName, isAdminSession } from "@/lib/admin-session";
import { staffSessionCookieName, verifyStaffSession } from "@/lib/staff-session";
import { ensureRetailerWalletRefundTable } from "@/lib/retailer-wallet-refunds";

export const dynamic = "force-dynamic";

async function authorized(request: NextRequest) {
  const jar = await cookies();
  const admin = request.cookies.get(adminSessionCookieName)?.value || jar.get(adminSessionCookieName)?.value;
  if (isAdminSession(admin)) return { name: "Administrator" };
  const staffCookie = request.cookies.get(staffSessionCookieName)?.value || jar.get(staffSessionCookieName)?.value;
  const staff = verifyStaffSession(staffCookie);
  return staff?.canVerify ? { name: staff.name } : null;
}

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ ok: false, error: "Verification staff authorization required." }, { status: 401 });
  try {
    await ensureRetailerWalletRefundTable();
    const requests = await prisma.$queryRawUnsafe<any[]>(
      `SELECT r.id, r.retailer_id, r.amount, r.reason, r.status, r.staff_note,
              r.requested_at, r.reviewed_at, r.reviewed_by, r.paid_at,
              u.name AS retailer_name, u.shop_name, u.registration_no, u.phone
       FROM retailer_wallet_refunds r LEFT JOIN retail_users u ON u.id = r.retailer_id
       ORDER BY CASE WHEN r.status = 'REQUESTED' THEN 0 WHEN r.status = 'APPROVED' THEN 1 ELSE 2 END, r.id DESC LIMIT 200`);
    return NextResponse.json({ ok: true, requests: requests.map((row) => ({
      ...row,
      id: Number(row.id),
      retailer_id: Number(row.retailer_id),
      amount: Number(row.amount),
      requested_at: row.requested_at ? new Date(row.requested_at).toISOString() : null,
      reviewed_at: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
      paid_at: row.paid_at ? new Date(row.paid_at).toISOString() : null,
    })) });
  } catch (error) {
    console.error("Admin retailer wallet refund query failed:", error);
    return NextResponse.json({ ok: false, error: "Could not load retailer wallet refunds." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const actor = await authorized(request);
  if (!actor) return NextResponse.json({ ok: false, error: "Verification staff authorization required." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  const action = String(body.action || "").toUpperCase();
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
  if (!Number.isSafeInteger(id) || id <= 0 || !["APPROVE", "REJECT", "MARK_PAID"].includes(action)) {
    return NextResponse.json({ ok: false, error: "A valid request and review action are required." }, { status: 400 });
  }

  try {
    await ensureRetailerWalletRefundTable();
    const outcome = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<any[]>("SELECT * FROM retailer_wallet_refunds WHERE id = ? LIMIT 1 FOR UPDATE", id);
      const refund = rows[0];
      if (!refund) throw new Error("Refund request was not found.");

      if (action === "APPROVE") {
        if (refund.status !== "REQUESTED") throw new Error("Only a requested refund can be approved.");
        await tx.$executeRawUnsafe(
          "UPDATE retailer_wallet_refunds SET status = 'APPROVED', staff_note = ?, reviewed_at = NOW(), reviewed_by = ? WHERE id = ?",
          note || null, actor.name, id);
        return "Refund approved. The held wallet funds are ready for payout.";
      }

      if (action === "REJECT") {
        if (!["REQUESTED", "APPROVED"].includes(String(refund.status))) throw new Error("This refund can no longer be rejected.");
        const retailerRows = await tx.$queryRawUnsafe<any[]>("SELECT id FROM retail_users WHERE id = ? LIMIT 1 FOR UPDATE", refund.retailer_id);
        if (!retailerRows.length) throw new Error("Retailer account was not found; wallet funds were not released.");
        await tx.$executeRawUnsafe("UPDATE retail_users SET wallet_balance = wallet_balance + ? WHERE id = ?", refund.amount, refund.retailer_id);
        await tx.$executeRawUnsafe(
          `INSERT INTO retail_wallet_transactions (retailer_id, type, amount, source_type, description, created_at)
           VALUES (?, 'credit', ?, 'wallet_refund_release', ?, NOW())`,
          refund.retailer_id, refund.amount, `Wallet refund request ${id} rejected; held balance returned to wallet.`);
        await tx.$executeRawUnsafe(
          "UPDATE retailer_wallet_refunds SET status = 'REJECTED', staff_note = ?, reviewed_at = NOW(), reviewed_by = ? WHERE id = ?",
          note || "Request declined by staff; held funds returned to wallet.", actor.name, id);
        return "Refund request rejected; held funds returned to the retailer wallet.";
      }

      if (refund.status !== "APPROVED") throw new Error("Approve this refund before marking its payout as paid.");
      await tx.$executeRawUnsafe(
        "UPDATE retailer_wallet_refunds SET status = 'PAID', staff_note = ?, paid_at = NOW(), reviewed_by = ? WHERE id = ?",
        note || refund.staff_note, actor.name, id);
      await tx.$executeRawUnsafe(
        `UPDATE retail_wallet_transactions SET description = ?
         WHERE retailer_id = ? AND source_type = 'wallet_refund_hold' AND description = ? LIMIT 1`,
        `Wallet refund request ${id} paid by staff.`, refund.retailer_id, `Wallet refund hold for request ${id}; payout pending staff review.`);
      return "Payout recorded as paid. The held wallet amount remains debited.";
    });
    return NextResponse.json({ ok: true, message: outcome });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not process refund request.";
    return NextResponse.json({ ok: false, error: message }, { status: 409 });
  }
}
