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
      `SELECT id, registration_no, name, email, phone, verification_status, rejection_reason, 
              aadhaar_no, aadhaar_photo, pan_no, pan_photo, address, created_at, updated_at
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
      kyc: {
        id: d.id,
        registrationNo: d.registration_no,
        name: d.name,
        email: d.email,
        phone: d.phone,
        verificationStatus: d.verification_status || "Approved",
        rejectionReason: d.rejection_reason,
        aadhaarNo: d.aadhaar_no ? `XXXX-XXXX-${String(d.aadhaar_no).slice(-4)}` : null,
        aadhaarPhoto: d.aadhaar_photo,
        panNo: d.pan_no,
        panPhoto: d.pan_photo,
        address: d.address,
        updatedAt: d.updated_at || d.created_at,
      },
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
    const { panNo, aadhaarNo, address } = body;

    await prisma.$executeRawUnsafe(
      `UPDATE distributors 
       SET pan_no = COALESCE(?, pan_no),
           aadhaar_no = COALESCE(?, aadhaar_no),
           address = COALESCE(?, address),
           verification_status = 'Approved',
           updated_at = NOW()
       WHERE id = ?`,
      panNo || null,
      aadhaarNo || null,
      address || null,
      distributor.id
    );

    return NextResponse.json({
      ok: true,
      message: "Mandatory Distributor KYC dossier updated and verified.",
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
