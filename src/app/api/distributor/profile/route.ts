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

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, registration_no, name, email, phone, wallet_balance, total_commission_earned, 
              commission_percentage, verification_status, referral_code, address, created_at, updated_at
       FROM distributors 
       WHERE id = ? LIMIT 1`,
      distributor.id
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Distributor not found" }, { status: 404 });
    }

    const d = rows[0];

    return NextResponse.json({
      ok: true,
      profile: {
        id: d.id,
        registrationNo: d.registration_no || `DIST-${String(d.id).padStart(4, "0")}`,
        name: d.name,
        email: d.email,
        phone: d.phone,
        address: d.address || "Tamil Nadu Territory Operations Hub",
        walletBalance: Number(d.wallet_balance || 0),
        totalCommissionEarned: Number(d.total_commission_earned || 0),
        commissionPercentage: Number(d.commission_percentage || 5),
        verificationStatus: d.verification_status || "Approved",
        referralCode: d.referral_code || `DISTREF${d.id}`,
        joinedDate: d.created_at,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const distributor = await getAuthDistributor(request);
    if (!distributor) {
      return NextResponse.json({ ok: false, error: "Unauthorized Distributor session" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, address } = body;

    await prisma.$executeRawUnsafe(
      `UPDATE distributors 
       SET name = COALESCE(?, name),
           phone = COALESCE(?, phone),
           address = COALESCE(?, address),
           updated_at = NOW()
       WHERE id = ?`,
      name || null,
      phone || null,
      address || null,
      distributor.id
    );

    return NextResponse.json({ ok: true, message: "Distributor profile updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
