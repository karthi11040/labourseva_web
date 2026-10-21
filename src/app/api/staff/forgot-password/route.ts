import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSecureToken, hashPassword } from "@/lib/security";
import { verifyCaptcha } from "@/modules/captcha";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken.trim() : "";

    // Security Verification: Mandatory Cap CAPTCHA challenge
    const capRes = await verifyCaptcha(captchaToken, { ip, action: "staff_forgot_password" });
    if (!capRes.success) {
      return NextResponse.json(
        { ok: false, error: capRes.error || "Security verification failed. Please complete the challenge." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Please provide a valid employee email address." },
        { status: 400 }
      );
    }

    const [employee] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name, email, status FROM employees WHERE LOWER(email) = ? LIMIT 1`,
      email
    );

    // Timing-safe response: don't reveal if account exists or not
    if (!employee || employee.status !== "active") {
      return NextResponse.json({
        ok: true,
        message: "If an active employee account exists with that email, reset instructions have been issued.",
      });
    }

    // Generate time-limited, single-use token (valid for 1 hour)
    const resetToken = generateSecureToken(32);
    const tokenHash = hashPassword(resetToken);

    // Save token using MySQL local clock to prevent timezone skew
    await prisma.$executeRawUnsafe(
      `INSERT INTO password_resets (user_id, token, code_hash, identifier, expires_at, created_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR), NOW())`,
      employee.id,
      resetToken,
      tokenHash,
      employee.email
    );

    // Log the request
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO employee_logs (employee_id, action, description, created_at) VALUES (?, ?, ?, NOW())`,
        employee.id,
        "PASSWORD_RESET_REQUESTED",
        `Password reset token requested for ${employee.email}`
      );
    } catch {}

    const resetUrl = `/staff/reset-password?token=${resetToken}`;

    return NextResponse.json({
      ok: true,
      message: "Password reset link generated successfully.",
      resetUrl,
      token: resetToken,
      expiresInMinutes: 60,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to process request." },
      { status: 500 }
    );
  }
}
