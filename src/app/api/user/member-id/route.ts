import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCitizenIdentity } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const citizen = await getCitizenIdentity(request);
  if (!citizen?.customerId) {
    return NextResponse.json({ ok: false, error: "Please sign in to view your member ID." }, { status: 401 });
  }

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, full_name, verification_status FROM customers WHERE id = ? LIMIT 1`,
      citizen.customerId
    );
    const customer = rows[0];
    if (!customer) return NextResponse.json({ ok: false, error: "Account not found." }, { status: 404 });

    const submissions = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM kyc_audit_logs WHERE user_type = 'customer' AND user_id = ? AND action_performed = 'submit_verification' LIMIT 1`,
      customer.id
    );
    const verified = String(customer.verification_status || "").toLowerCase() === "approved" && submissions.length > 0;
    return NextResponse.json({
      ok: true,
      verified,
      memberId: verified ? `LS-${String(customer.id).padStart(8, "0")}` : null,
      name: verified ? String(customer.full_name || citizen.name || "Citizen") : null,
    });
  } catch (error) {
    console.error("GET /api/user/member-id error:", error);
    return NextResponse.json({ ok: false, error: "Could not load your member ID." }, { status: 500 });
  }
}
