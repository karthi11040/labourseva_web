import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthRetailer } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const retailer = await getAuthRetailer(request);
    if (!retailer) {
      return NextResponse.json({ ok: false, error: "Unauthorized Kendra session" }, { status: 401 });
    }

    // 1. Commission rules
    const rules = await prisma.$queryRawUnsafe<any[]>(
      `SELECT cr.id, cr.service_id, cr.service_name, cr.commission_model, cr.distributor_value, cr.retailer_profit, s.name AS db_service_name, s.payment_amount
       FROM commission_rules cr
       LEFT JOIN services s ON cr.service_id = s.id
       ORDER BY cr.id ASC`
    ).catch(() => []);

    // 2. Aggregate lifetime earned commissions across full ledger history
    const [aggregate] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT COALESCE(SUM(amount), 0) AS total_commission
       FROM retail_wallet_transactions
       WHERE retailer_id = ? AND type = 'credit' AND source_type LIKE '%commission%'`,
      retailer.id
    ).catch(() => [{ total_commission: 0 }]);

    const totalEarned = Number(aggregate?.total_commission || 0);

    // 3. Paginated commission transactions history from ledger (most recent 50)
    const commissions = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, amount, description, created_at
       FROM retail_wallet_transactions
       WHERE retailer_id = ? AND type = 'credit' AND source_type LIKE '%commission%'
       ORDER BY id DESC
       LIMIT 50`,
      retailer.id
    ).catch(() => []);

    return NextResponse.json({
      ok: true,
      totalEarned,
      rules: rules.map(r => ({
        id: r.id,
        serviceId: r.service_id,
        serviceName: r.service_name || r.db_service_name || "Statutory Scheme",
        commissionModel: r.commission_model,
        retailerProfit: Number(r.retailer_profit || 0),
        distributorValue: Number(r.distributor_value || 0),
        serviceFee: Number(r.payment_amount || 50),
      })),
      history: commissions.map(c => ({
        id: c.id,
        amount: Number(c.amount || 0),
        description: c.description,
        createdAt: c.created_at,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
