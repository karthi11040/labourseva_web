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

    // 1. Commission rules
    const rules = await prisma.$queryRawUnsafe<any[]>(
      `SELECT cr.id, cr.service_id, cr.service_name, cr.commission_model, cr.distributor_value, cr.retailer_profit, s.name AS db_service_name, s.payment_amount
       FROM commission_rules cr
       LEFT JOIN services s ON cr.service_id = s.id
       ORDER BY cr.id ASC`
    ).catch(() => []);

    // 2. Commission transactions history
    const commHistory = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, amount, description, reference_id, created_at 
       FROM distributor_transactions 
       WHERE (distributor_id = ? OR distributor_id = ?) AND type = 'credit' AND description LIKE '%commission%'
       ORDER BY id DESC 
       LIMIT 100`,
      distributor.id,
      String(distributor.id)
    ).catch(() => []);

    // 3. Subordinate Kendra retailers breakdown
    const retailers = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
         ru.id,
         ru.shop_name,
         ru.name,
         ru.registration_no,
         COUNT(ro.id) AS total_orders,
         COALESCE(SUM(ro.amount), 0) AS total_order_volume
       FROM retail_users ru
       LEFT JOIN retail_orders ro ON ru.id = ro.user_id
       WHERE ru.distributor_id = ? OR ru.distributor_id = ?
       GROUP BY ru.id, ru.shop_name, ru.name, ru.registration_no
       ORDER BY total_order_volume DESC`,
      distributor.id,
      String(distributor.id)
    ).catch(() => []);

    return NextResponse.json({
      ok: true,
      totalCommissionEarned: Number(distributor.total_commission_earned || 0),
      rules: rules.map(r => ({
        id: r.id,
        serviceName: r.service_name || r.db_service_name || "Statutory Welfare Scheme",
        serviceFee: Number(r.payment_amount || 50),
        distributorOverride: Number(r.distributor_value || 5),
        retailerProfit: Number(r.retailer_profit || 10),
      })),
      retailerBreakdown: retailers.map(ret => ({
        id: ret.id,
        name: ret.name,
        shopName: ret.shop_name || "Kendra Counter",
        registrationNo: ret.registration_no,
        totalOrders: Number(ret.total_orders || 0),
        totalOrderVolume: Number(ret.total_order_volume || 0),
        estimatedOverride: Number(ret.total_orders || 0) * 5,
      })),
      history: commHistory.map(h => ({
        id: h.id,
        amount: Number(h.amount || 0),
        description: h.description,
        referenceId: h.reference_id,
        createdAt: h.created_at,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
