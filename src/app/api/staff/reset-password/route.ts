import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/security";
import { verifyCaptcha } from "@/modules/captcha";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken.trim() : "";

    // Security Verification: Mandatory Cap CAPTCHA challenge
    const capRes = await verifyCaptcha(captchaToken, { ip, action: "staff_reset_password" });
    if (!capRes.success) {
      return NextResponse.json(
        { ok: false, error: capRes.error || "Security verification failed. Please complete the challenge." },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "A valid reset token is required." },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // 1. Find token
    const [resetRecord] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT *, (expires_at < NOW()) AS is_expired FROM password_resets WHERE token = ? LIMIT 1`,
      token
    );

    if (!resetRecord) {
      return NextResponse.json(
        { ok: false, error: "Password reset token is invalid or has already been used." },
        { status: 400 }
      );
    }

    // 2. Check expiration
    const isExpired = Boolean(
      Number(resetRecord.is_expired) === 1 ||
      new Date(resetRecord.expires_at).getTime() < Date.now()
    );

    if (isExpired) {
      // Delete expired token
      await prisma.$executeRawUnsafe(
        `DELETE FROM password_resets WHERE id = ?`,
        resetRecord.id
      );
      return NextResponse.json(
        { ok: false, error: "Password reset token has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // 3. Hash new password with modern scrypt algorithm
    const newPasswordHash = hashPassword(newPassword);

    // 4. Update employee password
    await prisma.$executeRawUnsafe(
      `UPDATE employees SET password_hash = ?, updated_at = NOW() WHERE id = ?`,
      newPasswordHash,
      resetRecord.user_id
    );

    // 5. Invalidate / delete the token immediately (single-use)
    await prisma.$executeRawUnsafe(
      `DELETE FROM password_resets WHERE id = ?`,
      resetRecord.id
    );

    // 6. Log password reset
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO employee_logs (employee_id, action, description, created_at) VALUES (?, ?, ?, NOW())`,
        resetRecord.user_id,
        "PASSWORD_RESET_COMPLETED",
        `Password was successfully reset using token`
      );
    } catch {}

    return NextResponse.json({
      ok: true,
      message: "Your password has been successfully reset. You may now log in.",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to reset password." },
      { status: 500 }
    );
  }
}
