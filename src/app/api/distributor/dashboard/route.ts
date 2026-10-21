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

    // 1. Fresh distributor particulars
    const distRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, registration_no, name, email, phone, wallet_balance, total_commission_earned, verification_status 
       FROM distributors 
       WHERE id = ? LIMIT 1`,
      distributor.id
    );
    const dist = distRows[0] || distributor;

    // 2. Count of affiliated retailers
    const retCountRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
         COUNT(*) AS total_retailers,
         SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS active_retailers,
         SUM(wallet_balance) AS total_network_retailer_balance
       FROM retail_users 
       WHERE distributor_id = ? OR distributor_id = ?`,
      dist.id,
      String(dist.id)
    ).catch(() => [{ total_retailers: 0, active_retailers: 0, total_network_retailer_balance: 0 }]);

    const retStats = retCountRows[0] || { total_retailers: 0, active_retailers: 0, total_network_retailer_balance: 0 };

    // 3. Network orders summary from affiliated retailers
    const orderStatsRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
         COUNT(*) AS total_orders,
         COALESCE(SUM(ro.amount), 0) AS total_order_volume
       FROM retail_orders ro
       INNER JOIN retail_users ru ON ro.user_id = ru.id
       WHERE ru.distributor_id = ? OR ru.distributor_id = ?`,
      dist.id,
      String(dist.id)
    ).catch(() => [{ total_orders: 0, total_order_volume: 0 }]);

    const orderStats = orderStatsRows[0] || { total_orders: 0, total_order_volume: 0 };

    // 4. Recent distributor transactions
    const recentTx = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, amount, type, description, reference_id, created_at 
       FROM distributor_transactions 
       WHERE distributor_id = ? OR distributor_id = ?
       ORDER BY id DESC 
       LIMIT 10`,
      dist.id,
      String(dist.id)
    ).catch(() => []);

    // 5. Affiliated retailers summary
    const affiliatedRetailers = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, registration_no, name, shop_name, phone, email, wallet_balance, status 
       FROM retail_users 
       WHERE distributor_id = ? OR distributor_id = ?
       ORDER BY id DESC 
       LIMIT 5`,
      dist.id,
      String(dist.id)
    ).catch(() => []);

    return NextResponse.json({
      ok: true,
      distributor: {
        id: dist.id,
        registrationNo: dist.registration_no,
        name: dist.name,
        email: dist.email,
        phone: dist.phone,
        walletBalance: Number(dist.wallet_balance || 0),
        totalCommissionEarned: Number(dist.total_commission_earned || 0),
        verificationStatus: dist.verification_status || "Approved",
      },
      stats: {
        walletBalance: Number(dist.wallet_balance || 0),
        totalCommissionEarned: Number(dist.total_commission_earned || 0),
        totalRetailers: Number(retStats.total_retailers || 0),
        activeRetailers: Number(retStats.active_retailers || 0),
        networkOrdersCount: Number(orderStats.total_orders || 0),
        networkOrdersVolume: Number(orderStats.total_order_volume || 0),
      },
      affiliatedRetailers,
      recentTransactions: recentTx.map(t => ({
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
