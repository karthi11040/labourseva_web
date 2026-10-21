import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCitizenIdentity } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  try {
    const citizen = await getCitizenIdentity(request);
    if (!citizen?.customerId) {
      return NextResponse.json({ ok: false, error: "Please sign in to save your profile." }, { status: 401 });
    }

    const [customer] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT verification_status FROM customers WHERE id = ? LIMIT 1`, citizen.customerId
    );
    if (!customer) return NextResponse.json({ ok: false, error: "Account not found." }, { status: 404 });
    const submitted = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM kyc_audit_logs WHERE user_type = 'customer' AND user_id = ? AND action_performed = 'submit_verification' LIMIT 1`,
      citizen.customerId
    );
    if (String(customer.verification_status || "").toLowerCase() === "approved" && submitted.length > 0) {
      return NextResponse.json({ ok: true, saved: false, message: "Your approved profile is read-only." });
    }

    const body = await request.json().catch(() => ({}));
    const profile = body?.profileData;
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
      return NextResponse.json({ ok: false, error: "Profile information is required." }, { status: 400 });
    }

    const notes = `Verification profile draft: ${JSON.stringify(profile)}`;
    if (notes.length > 30000) {
      return NextResponse.json({ ok: false, error: "Profile draft is too large to save." }, { status: 413 });
    }
    const drafts = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, notes FROM kyc_audit_logs WHERE user_type = 'customer' AND user_id = ? AND action_performed = 'save_profile_draft' ORDER BY id DESC LIMIT 1`,
      citizen.customerId
    );
    if (drafts.length) {
      try {
        const existingNotes = String(drafts[0].notes || "");
        const prefix = "Verification profile draft: ";
        const existingProfile = JSON.parse(existingNotes.startsWith(prefix) ? existingNotes.slice(prefix.length) : "{}");
        if (Number(existingProfile._draftRevision || 0) > Number(profile._draftRevision || 0)) {
          return NextResponse.json({ ok: true, saved: false, stale: true });
        }
      } catch { /* replace malformed prior draft with the valid incoming draft */ }
      await prisma.$executeRawUnsafe(
        `UPDATE kyc_audit_logs SET notes = ?, created_at = NOW() WHERE id = ?`, notes, drafts[0].id
      );
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO kyc_audit_logs (user_type, user_id, admin_id, action_performed, old_status, new_status, notes, ip_address, created_at)
         VALUES ('customer', ?, 0, 'save_profile_draft', ?, ?, ?, '127.0.0.1', NOW())`,
        citizen.customerId,
        customer.verification_status || "Not Submitted",
        customer.verification_status || "Pending",
        notes
      );
    }

    return NextResponse.json({ ok: true, saved: true, savedAt: new Date().toISOString() });
  } catch (error) {
    console.error("PUT /api/verification/draft error:", error);
    return NextResponse.json({ ok: false, error: "Could not save the profile draft." }, { status: 500 });
  }
}
