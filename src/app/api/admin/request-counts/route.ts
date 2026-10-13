import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [
      customerPending,
      retailPending,
      distributorPending,
      guestPending,
      unverifiedAccounts,
      esPending,
      pendingTxns,
      openTicketsRaw,
    ] = await Promise.all([
      prisma.application.count({
        where: {
          applicantType: "CUSTOMER",
          status: { in: ["IN_REVIEW", "PAID_PENDING_VERIFICATION", "PENDING_PAYMENT"] },
        },
      }).catch(() => 0),

      prisma.application.count({
        where: {
          OR: [
            { applicantType: "ASSISTED_RETAILER" },
            { retailerId: { not: null } },
          ],
          status: { in: ["IN_REVIEW", "PAID_PENDING_VERIFICATION", "PENDING_PAYMENT"] },
        },
      }).catch(() => 0),

      prisma.application.count({
        where: {
          distributorId: { not: null },
          status: { in: ["IN_REVIEW", "PAID_PENDING_VERIFICATION", "PENDING_PAYMENT"] },
        },
      }).catch(() => 0),

      prisma.application.count({
        where: {
          applicantType: "GUEST",
          status: { in: ["IN_REVIEW", "PAID_PENDING_VERIFICATION", "PENDING_PAYMENT"] },
        },
      }).catch(() => 0),

      prisma.user.count({
        where: {
          status: { in: ["PENDING_VERIFICATION", "PENDING_KYC", "PENDING_APPROVAL"] },
        },
      }).catch(() => 0),

      prisma.application.count({
        where: {
          status: { in: ["IN_REVIEW", "PAID_PENDING_VERIFICATION"] },
        },
      }).catch(() => 0),

      prisma.payment.count({
        where: {
          status: { in: ["CREATED", "PENDING", "AUTHORIZED"] },
        },
      }).catch(() => 0),

      prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) AS cnt FROM helpdesk_tickets WHERE status IN ('OPEN', 'IN_PROGRESS', 'ESCALATED')`
      ).then((rows) => Number(rows[0]?.cnt || 0)).catch(() => 0),
    ]);

    const all = customerPending + retailPending + distributorPending + guestPending;

    return NextResponse.json({
      customer: customerPending,
      retail: retailPending,
      distributor: distributorPending,
      guest: guestPending,
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
