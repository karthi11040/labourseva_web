import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCitizenIdentity, getAuthRetailer, getAuthDistributor } from "@/lib/auth-helpers";
import { getAuthenticatedActor } from "@/lib/staff-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Staff / Admin
    const staff = getAuthenticatedActor(request);
    if (staff.role === "ADMIN" || staff.role === "EMPLOYEE") {
      return NextResponse.json({
        ok: true,
        role: staff.role,
        id: staff.id,
        name: staff.name,
        email: staff.email,
        status: "APPROVED",
        isApproved: true,
        isEmailVerified: true,
        permissions: {
          canVerify: staff.canVerify,
          canSign: staff.canSign,
          canReviewApplications: true,
        },
      });
    }

    // 2. Retailer
    const retailer = await getAuthRetailer(request);
    if (retailer) {
      const isApproved = Boolean(Number(retailer.is_approved) === 1 && String(retailer.status || "").toLowerCase() === "approved");
      return NextResponse.json({
        ok: true,
        role: "RETAILER",
        id: retailer.id,
        name: retailer.name,
        shopName: retailer.shop_name,
        email: retailer.email,
        phone: retailer.phone,
        status: retailer.status,
        isApproved,
        isEmailVerified: true,
        walletBalance: Number(retailer.wallet_balance || 0),
        permissions: {
          canApplyServices: isApproved,
          canTopupWallet: true,
        },
      });
    }

    // 3. Distributor
    const distributor = await getAuthDistributor(request);
    if (distributor) {
      const isApproved = Boolean(distributor.verification_status === "Approved");
      return NextResponse.json({
        ok: true,
        role: "DISTRIBUTOR",
        id: distributor.id,
        name: distributor.name,
        email: distributor.email,
        phone: distributor.phone,
        status: distributor.verification_status,
        isApproved,
        isEmailVerified: true,
        walletBalance: Number(distributor.wallet_balance || 0),
        permissions: {
          canManageRetailers: isApproved,
          canDistributeFloat: isApproved,
        },
      });
    }

    // 4. Customer (Citizen)
    const citizen = await getCitizenIdentity(request);
    if (citizen) {
      let isVerified = false;
      let verificationStatus = "PENDING_APPROVAL";
      let isApproved = false;
      let rejectionReason: string | null = null;

      try {
        const rows = await prisma.$queryRawUnsafe<any[]>(
          `SELECT email_verified, verification_status, status, rejection_reason FROM customers WHERE phone = ? LIMIT 1`,
          citizen.phone
        );
        if (rows && rows.length > 0) {
          isVerified = Boolean(Number(rows[0].email_verified) === 1);
          verificationStatus = rows[0].verification_status || "Pending";
          isApproved = String(verificationStatus).toLowerCase() === "approved";
          rejectionReason = rows[0].rejection_reason || null;
        }
      } catch {}

      return NextResponse.json({
        ok: true,
        role: "CUSTOMER",
        id: citizen.customerId,
        name: citizen.name,
        email: citizen.email,
        phone: citizen.phone,
        isEmailVerified: isVerified,
        status: verificationStatus,
        isApproved,
        rejectionReason,
        permissions: {
          canApplyDocumentServices: isApproved,
          canApplyEServices: isApproved,
          canAccessVault: isApproved,
          canViewReceipts: true,
        },
      });
    }

    return NextResponse.json(
      { ok: false, error: "Unauthenticated. Please sign in to view account status." },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Failed to fetch account status." },
      { status: 500 }
    );
  }
}
