import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthDistributor } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const distributor = await getAuthDistributor(request);
    if (!distributor) {
      return NextResponse.json({ ok: false, error: "Unauthorized Distributor session" }, { status: 401 });
    }

    // 1. Fresh balance
    const distRows = await prisma.$queryRawUnsafe<any[]>(
      "SELECT id, wallet_balance, total_commission_earned, registration_no, name FROM distributors WHERE id = ? LIMIT 1",
      distributor.id
    );
    const dist = distRows[0] || distributor;

    // 2. Transactions from distributor_transactions
    const transactions = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, amount, type, description, reference_id, created_at 
       FROM distributor_transactions 
       WHERE distributor_id = ? OR distributor_id = ?
       ORDER BY id DESC 
       LIMIT 100`,
      dist.id,
      String(dist.id)
    ).catch(() => []);

    // 3. Aggregate totals
    let totalCredited = 0;
    let totalTransferredToKendra = 0;
    for (const t of transactions) {
      const amt = Number(t.amount || 0);
      if (t.type === "credit") totalCredited += amt;
      else if (t.type === "debit") totalTransferredToKendra += amt;
    }

    return NextResponse.json({
      ok: true,
      walletBalance: Number(dist.wallet_balance || 0),
      totalCommissionEarned: Number(dist.total_commission_earned || 0),
      totalCredited,
      totalTransferredToKendra,
      transactions: transactions.map(t => ({
        id: t.id,
        amount: Number(t.amount || 0),
        type: t.type,
        description: t.description,
        referenceId: t.reference_id,
        createdAt: t.created_at,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const distributor = await getAuthDistributor(request);
    if (!distributor) {
      return NextResponse.json({ ok: false, error: "Unauthorized Distributor session" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, paymentMethod, referenceNote } = body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return NextResponse.json({ ok: false, error: "Please enter a valid top-up amount" }, { status: 400 });
    }

    // Credit distributor wallet
    await prisma.$executeRawUnsafe(
      "UPDATE distributors SET wallet_balance = wallet_balance + ? WHERE id = ?",
      numAmount,
      distributor.id
    );

    // Record credit in distributor_transactions
    const ref = `TOPUP-DIST-${distributor.id}-${Date.now()}`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO distributor_transactions (distributor_id, amount, type, description, reference_id, created_at)
       VALUES (?, ?, 'credit', ?, ?, NOW())`,
      String(distributor.id),
      numAmount,
      `Distributor Float Recharge via ${paymentMethod || "Corporate Gateway"}. Note: ${referenceNote || "Float replenishment"}`,
      ref
    );

    const updated = await prisma.$queryRawUnsafe<any[]>(
      "SELECT wallet_balance FROM distributors WHERE id = ? LIMIT 1",
      distributor.id
    );

    return NextResponse.json({
      ok: true,
      message: `Distributor wallet successfully credited with ₹${numAmount.toFixed(2)}.`,
      newBalance: Number(updated[0]?.wallet_balance || 0),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
