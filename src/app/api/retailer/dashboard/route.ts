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

    // 1. Fetch fresh retailer details
    const retRows = await prisma.$queryRawUnsafe<any[]>(
      "SELECT id, registration_no, name, shop_name, email, phone, wallet_balance, status, distributor_id FROM retail_users WHERE id = ? LIMIT 1",
      retailer.id
    );
    const ret = retRows[0] || retailer;

    // 2. Fetch orders from retail_orders
    const orders = await prisma.$queryRawUnsafe<any[]>(
      `SELECT ro.id, ro.service_id, ro.amount, ro.payment_status, ro.status, ro.created_at, ro.transaction_id, s.name AS service_name
       FROM retail_orders ro
       LEFT JOIN services s ON ro.service_id = s.id
       WHERE ro.user_id = ?
       ORDER BY ro.id DESC
       LIMIT 10`,
      ret.id
    ).catch(() => []);

    // 3. Fetch count metrics combining retail_orders and es_service_requests
    const allRetailOrders = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, transaction_id, status, payment_response FROM retail_orders WHERE user_id = ?`,
      ret.id
    ).catch(() => []);

    const allEsRequests = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, application_number, status FROM es_service_requests WHERE retailer_id = ?`,
      ret.id
    ).catch(() => []);

    const txIds = allRetailOrders.map(ro => ro.transaction_id).filter(Boolean);
    const statutoryList = txIds.length > 0 ? await prisma.$queryRawUnsafe<any[]>(
      `SELECT status, gateway_order_id FROM service_requests 
       WHERE gateway_provider = 'KENDRA_WALLET' AND gateway_order_id IN (${txIds.map(() => "?").join(",")})`,
      ...txIds
    ).catch(() => []) : [];

    // Deduplicate applications by unique application reference / transaction identifier
    const appMap = new Map<string, { status: string }>();

    for (const ro of allRetailOrders) {
      let meta: any = {};
      try {
        meta = JSON.parse(ro.payment_response || "{}");
      } catch {}

      const ref = meta.appRef || ro.transaction_id || `ORD-${ro.id}`;
      let status = String(ro.status || "pending").toLowerCase();

      const matchingStat = statutoryList.find(s => s.gateway_order_id === ro.transaction_id);
      if (matchingStat && matchingStat.status) {
        status = String(matchingStat.status).toLowerCase();
      }

      appMap.set(ref, { status });
    }

    for (const er of allEsRequests) {
      const ref = er.application_number || `ES-${er.id}`;
      const erStatus = String(er.status || "pending").toLowerCase();
      appMap.set(ref, { status: erStatus });
    }

    let totalOrders = 0;
    let pendingCount = 0;
    let completedCount = 0;
    let rejectedCount = 0;

    for (const { status } of appMap.values()) {
      totalOrders++;
      const s = status.toLowerCase();
      if (["approved", "accepted", "completed", "issued"].includes(s)) {
        completedCount++;
      } else if (["rejected", "returned", "cancelled"].includes(s)) {
        rejectedCount++;
      } else {
        pendingCount++;
      }
    }

    const orderStats = {
      total_orders: totalOrders,
      pending_count: pendingCount,
      completed_count: completedCount,
      rejected_count: rejectedCount,
    };

    // 4. Fetch commission credits from retail_wallet_transactions
    const commRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT SUM(amount) AS total_commission 
       FROM retail_wallet_transactions 
       WHERE retailer_id = ? AND type = 'credit' AND source_type LIKE '%commission%'`,
      ret.id
    ).catch(() => [{ total_commission: 0 }]);

    const totalCommission = Number(commRows[0]?.total_commission || 0);

    // 5. Recent 5 wallet transactions
    const recentTransactions = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, type, amount, source_type, description, created_at 
       FROM retail_wallet_transactions 
       WHERE retailer_id = ? 
       ORDER BY id DESC 
       LIMIT 5`,
      ret.id
    ).catch(() => []);

    return NextResponse.json({
      ok: true,
      retailer: {
        id: ret.id,
        registrationNo: ret.registration_no,
        name: ret.name,
        shopName: ret.shop_name,
        email: ret.email,
        phone: ret.phone,
        walletBalance: Number(ret.wallet_balance || 0),
        status: ret.status,
      },
      stats: {
        walletBalance: Number(ret.wallet_balance || 0),
        totalOrders: Number(orderStats.total_orders || 0),
        pendingCount: Number(orderStats.pending_count || 0),
        completedCount: Number(orderStats.completed_count || 0),
        rejectedCount: Number(orderStats.rejected_count || 0),
        totalCommission,
      },
      recentOrders: orders,
      recentTransactions: recentTransactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount || 0),
        sourceType: t.source_type,
        description: t.description,
        createdAt: t.created_at,
        receiptUrl: t.type === "credit" ? `/api/retailer/wallet/receipt?id=${t.id}` : null,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
