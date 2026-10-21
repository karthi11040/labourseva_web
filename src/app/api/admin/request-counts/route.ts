import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      srCustPending,
      srRetPending,
      srGuestPending,
      gsoPending,
      roPending,
      esPending,
      unverifiedAccounts,
      pendingTxns,
      openTicketsRaw,
    ] = await Promise.all([
      // Customer pending in service_requests
      prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) as c FROM service_requests 
         WHERE (customer_id IS NOT NULL OR user_id > 0) 
           AND (gateway_provider != 'KENDRA_WALLET' OR gateway_provider IS NULL) 
           AND guest_id IS NULL 
           AND status IN ('pending', 'submitted', 'in_review')`
      ).then((r) => Number(r[0]?.c || 0)).catch(() => 0),

      // Retail pending in service_requests
      prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) as c FROM service_requests 
         WHERE (gateway_provider = 'KENDRA_WALLET' OR purchase_notes LIKE '%assistedKendra%')
           AND status IN ('pending', 'submitted', 'in_review')`
      ).then((r) => Number(r[0]?.c || 0)).catch(() => 0),

      // Guest pending in service_requests
      prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) as c FROM service_requests 
         WHERE guest_id IS NOT NULL 
           AND status IN ('pending', 'submitted', 'in_review')`
      ).then((r) => Number(r[0]?.c || 0)).catch(() => 0),

      // Guest pending in guest_service_orders
      prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) as c FROM guest_service_orders 
         WHERE payment_status IN ('pending', 'submitted')`
      ).then((r) => Number(r[0]?.c || 0)).catch(() => 0),

      // Retail pending in retail_orders
      prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) as c FROM retail_orders 
         WHERE status IN ('pending', 'submitted', 'in_review')`
      ).then((r) => Number(r[0]?.c || 0)).catch(() => 0),

      // E-services pending
      prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) as c FROM es_service_requests 
         WHERE status IN ('pending', 'submitted', 'in_review')`
      ).then((r) => Number(r[0]?.c || 0)).catch(() => 0),

      // Unverified accounts
      prisma.user.count({
        where: {
          status: { in: ["PENDING_VERIFICATION", "PENDING_KYC", "PENDING_APPROVAL"] },
        },
      }).catch(() => 0),

      // Pending payments
      prisma.payment.count({
        where: {
          status: { in: ["CREATED", "PENDING", "AUTHORIZED"] },
        },
      }).catch(() => 0),

      // Open helpdesk tickets
      prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) AS cnt FROM helpdesk_tickets WHERE status IN ('OPEN', 'IN_PROGRESS', 'ESCALATED')`
      ).then((rows) => Number(rows[0]?.cnt || 0)).catch(() => 0),
    ]);

    const customerTotalPending = srCustPending;
    const retailTotalPending = srRetPending + roPending;
    const guestTotalPending = srGuestPending + gsoPending;
    const all = customerTotalPending + retailTotalPending + guestTotalPending + esPending;

    return NextResponse.json({
      customer: customerTotalPending,
      retail: retailTotalPending,
      distributor: 0,
      guest: guestTotalPending,
      all,
      pending_txns: pendingTxns,
      unverified_accounts: unverifiedAccounts,
      es_pending: esPending,
      open_tickets: openTicketsRaw,
    });
  } catch {
    return NextResponse.json({
      customer: 0,
      retail: 0,
      distributor: 0,
      guest: 0,
      all: 0,
      pending_txns: 0,
      unverified_accounts: 0,
      es_pending: 0,
      open_tickets: 0,
    });
  }
}
