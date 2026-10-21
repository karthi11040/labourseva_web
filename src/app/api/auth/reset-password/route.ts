import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/security";
import { validateSecurityToken } from "@/lib/token-store";
import { dispatchPasswordChangedNotification } from "@/lib/notification-service";
import { verifyCaptcha } from "@/modules/captcha";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || "").trim();
    const newPassword = String(body.newPassword || "");
    const confirmPassword = String(body.confirmPassword || "");
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken.trim() : "";

    // Security Verification: Cap CAPTCHA — verified BEFORE the single-use
    // reset token is consumed so a failed challenge never burns it.
    const capRes = await verifyCaptcha(captchaToken, { ip, action: "reset_password" });
    if (!capRes.success) {
      return NextResponse.json(
        { ok: false, error: capRes.error || "Security verification failed. Please complete the challenge." },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json({ ok: false, error: "Missing password reset token." }, { status: 400 });
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ ok: false, error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return NextResponse.json({ ok: false, error: "Passwords do not match." }, { status: 400 });
    }

    // 1. Validate and consume token (enforcing single-use)
    const validation = await validateSecurityToken({
      rawToken: token,
      purpose: "PASSWORD_RESET",
      consume: true,
    });

    if (!validation.valid || !validation.identifier) {
      return NextResponse.json(
        { ok: false, error: validation.error || "Password reset token is invalid or has already been used." },
        { status: 400 }
      );
    }

    const email = validation.identifier.toLowerCase();
    const hashedPassword = hashPassword(newPassword);
    let userName = "Valued User";

    // 2. Update user password in target table
    try {
      const customers = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, full_name FROM customers WHERE LOWER(email) = ? LIMIT 1`,
        email
      );
      if (customers && customers.length > 0) {
        userName = customers[0].full_name || userName;
        await prisma.$executeRawUnsafe(
          `UPDATE customers SET password = ?, updated_at = NOW() WHERE id = ?`,
          hashedPassword,
          customers[0].id
        );
      } else {
        const retailers = await prisma.$queryRawUnsafe<any[]>(
          `SELECT id, name FROM retail_users WHERE LOWER(email) = ? LIMIT 1`,
          email
        );
        if (retailers && retailers.length > 0) {
          userName = retailers[0].name || userName;
          await prisma.$executeRawUnsafe(
            `UPDATE retail_users SET password = ?, updated_at = NOW() WHERE id = ?`,
            hashedPassword,
            retailers[0].id
          );
        } else {
          const employees = await prisma.$queryRawUnsafe<any[]>(
            `SELECT id, name FROM employees WHERE LOWER(email) = ? LIMIT 1`,
            email
          );
          if (employees && employees.length > 0) {
            userName = employees[0].name || userName;
            await prisma.$executeRawUnsafe(
              `UPDATE employees SET password = ?, updated_at = NOW() WHERE id = ?`,
              hashedPassword,
              employees[0].id
            );
          }
        }
      }
    } catch (err: any) {
      console.warn("[Reset Password DB Warning]:", err?.message);
    }

    // 3. Dispatch Security Alert Email
    await dispatchPasswordChangedNotification({
      name: userName,
      email,
      timestamp: new Date().toUTCString(),
    });

    return NextResponse.json({
      ok: true,
      message: "Your password has been updated successfully. You can now sign in with your new credentials.",
    });
  } catch (error: any) {
    console.error("[POST /api/auth/reset-password Error]:", error);
    return NextResponse.json(
      { ok: false, error: "An unexpected error occurred while resetting your password." },
      { status: 500 }
    );
  }
}
