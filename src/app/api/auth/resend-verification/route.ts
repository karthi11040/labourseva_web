import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, recordLoginFailure } from "@/lib/security";
import { createSecurityToken } from "@/lib/token-store";
import { dispatchEmailVerificationNotification } from "@/lib/notification-service";
import { verifyCaptcha } from "@/modules/captcha";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rateCheck = checkRateLimit(`resend_verify:${ip}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { ok: false, error: `Please wait ${rateCheck.remainingLockoutSeconds}s before requesting another verification email.` },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").toLowerCase().trim();
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken.trim() : "";

    // Security Verification: Validate Cap challenge only if provided
    if (captchaToken) {
      const capRes = await verifyCaptcha(captchaToken, { ip, action: "resend_verification" });
      if (!capRes.success) {
        return NextResponse.json(
          { ok: false, error: capRes.error || "Security verification failed. Please complete the challenge." },
          { status: 400 }
        );
      }
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Please provide a valid email address." }, { status: 400 });
    }

    // Lookup user
    let userName = "Citizen";
    let userId: string | number = 1;
    let found = false;

    try {
      const customers = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, full_name, email_verified FROM customers WHERE LOWER(email) = ? LIMIT 1`,
        email
      );
      if (customers && customers.length > 0) {
        if (Number(customers[0].email_verified) === 1) {
          return NextResponse.json({
            ok: true,
            message: "This email address is already verified. You can proceed to sign in.",
            alreadyVerified: true,
          });
        }
        userName = customers[0].full_name || userName;
        userId = customers[0].id;
        found = true;
      }
    } catch {}

    recordLoginFailure(`resend_verify:${ip}`);

    // If found, generate fresh token and dispatch
    if (found || email.includes("@")) {
      const rawToken = await createSecurityToken({
        identifier: email,
        userId,
        purpose: "EMAIL_VERIFICATION",
        expiresInMinutes: 24 * 60,
      });

      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://labourseva.com").replace(/\/$/, "");
      const verifyUrl = `${appUrl}/verify-email?token=${rawToken}`;

      await dispatchEmailVerificationNotification({
        name: userName,
        email,
        verifyUrl,
        expiryHours: 24,
      });
    }

    // Timing-consistent response to prevent email enumeration
    return NextResponse.json({
      ok: true,
      message: "If an unverified account exists for this email address, a fresh verification link has been dispatched.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: "Failed to resend verification email." },
      { status: 500 }
    );
  }
}
