import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/security";
import { getCitizenIdentity } from "@/lib/auth-helpers";
import { dispatchPasswordChangedNotification } from "@/lib/notification-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const me = await getCitizenIdentity(request);
    if (!me) {
      return NextResponse.json({ ok: false, error: "Please sign in to change your password." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    const confirmPassword = String(body.confirmPassword || "");

    if (!currentPassword) {
      return NextResponse.json({ ok: false, error: "Current password is required." }, { status: 400 });
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ ok: false, error: "New password must be at least 8 characters long." }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ ok: false, error: "New password and confirmation do not match." }, { status: 400 });
    }

    // Verify current password from database
    const customers = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, password, email, full_name FROM customers WHERE phone = ? LIMIT 1`,
      me.phone
    );

    if (!customers || customers.length === 0) {
      return NextResponse.json({ ok: false, error: "User account not found." }, { status: 404 });
    }

    const cust = customers[0];
    if (!verifyPassword(currentPassword, cust.password)) {
      return NextResponse.json({ ok: false, error: "Incorrect current password." }, { status: 400 });
    }

    const newHashed = hashPassword(newPassword);
    await prisma.$executeRawUnsafe(
      `UPDATE customers SET password = ?, updated_at = NOW() WHERE id = ?`,
      newHashed,
      cust.id
    );

    if (cust.email) {
      dispatchPasswordChangedNotification({
        name: cust.full_name || me.name,
        email: cust.email,
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, message: "Password updated successfully." });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: "Failed to update password." }, { status: 500 });
  }
}
