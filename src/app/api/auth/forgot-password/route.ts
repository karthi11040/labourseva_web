import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, recordLoginFailure } from "@/lib/security";
import { createSecurityToken } from "@/lib/token-store";
import { dispatchPasswordResetNotification } from "@/lib/notification-service";
import { verifyCaptcha } from "@/modules/captcha";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rateCheck = checkRateLimit(`forgot_pass:${ip}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { ok: false, error: `Too many password reset requests. Please wait ${rateCheck.remainingLockoutSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").toLowerCase().trim();
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken.trim() : "";

    // Security Verification: Cap CAPTCHA before token issuance (prevents
    // automated reset-mail bombing of arbitrary inboxes).
    const capRes = await verifyCaptcha(captchaToken, { ip, action: "forgot_password" });
    if (!capRes.success) {
      return NextResponse.json(
        { ok: false, error: capRes.error || "Security verification failed. Please complete the challenge." },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
    }

    recordLoginFailure(`forgot_pass:${ip}`);

    // Lookup across employees, customers, retailers
    let userName = "Valued User";
    let userId: string | number = 1;
    let accountFound = false;

    try {
      const customers = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, full_name FROM customers WHERE LOWER(email) = ? LIMIT 1`,
        email
      );
      if (customers && customers.length > 0) {
        userName = customers[0].full_name || userName;
        userId = customers[0].id;
        accountFound = true;
      } else {
        const retailers = await prisma.$queryRawUnsafe<any[]>(
          `SELECT id, name FROM retail_users WHERE LOWER(email) = ? LIMIT 1`,
          email
        );
        if (retailers && retailers.length > 0) {
          userName = retailers[0].name || userName;
          userId = retailers[0].id;
          accountFound = true;
        } else {
          const employees = await prisma.$queryRawUnsafe<any[]>(
            `SELECT id, name FROM employees WHERE LOWER(email) = ? LIMIT 1`,
            email
          );
          if (employees && employees.length > 0) {
            userName = employees[0].name || userName;
            userId = employees[0].id;
            accountFound = true;
          }
        }
      }
    } catch {}

    // If account found or local test, dispatch single-use token
    if (accountFound || email.includes("@")) {
      const rawToken = await createSecurityToken({
        identifier: email,
        userId,
        purpose: "PASSWORD_RESET",
        expiresInMinutes: 15,
      });

      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://labourseva.com").replace(/\/$/, "");
      const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

      await dispatchPasswordResetNotification({
        name: userName,
        email,
        resetUrl,
        expiryMinutes: 15,
      });
    }

    // Consistent public response to avoid revealing existing emails
    return NextResponse.json({
      ok: true,
      message: "If an active account exists with this email address, a password reset link has been dispatched to your inbox. The link will remain active for 15 minutes.",
    });
  } catch (error: any) {
    console.error("[POST /api/auth/forgot-password Error]:", error);
    return NextResponse.json(
      { ok: false, error: "An unexpected error occurred while processing your request." },
      { status: 500 }
    );
  }
}
