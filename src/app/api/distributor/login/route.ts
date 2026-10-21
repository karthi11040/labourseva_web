import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkLoginGuard,
  recordLoginFailureGuard,
  recordLoginSuccessGuard,
  clientIpFromRequest,
} from "@/lib/security/login-guard";
import { verifyWithProgressiveRehash } from "@/lib/security/legacy-rehash";
import { DISTRIBUTOR_COOKIE_NAME, DistributorSessionData } from "@/lib/distributor-session";
import { signHmacSession } from "@/lib/session-validator";
import { verifyCaptcha } from "@/modules/captcha";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = clientIpFromRequest(request);
  try {
    const body = await request.json();
    const { identifier, password, captchaToken } = body;

    // Security Verification: Validate Cap challenge
    if (!captchaToken && process.env.NODE_ENV !== "test") {
      return NextResponse.json(
        { ok: false, error: "Security verification challenge is required. Please complete the captcha." },
        { status: 400 }
      );
    }

    if (captchaToken) {
      const capRes = await verifyCaptcha(captchaToken, { ip, action: "distributor_login" });
      if (!capRes.success) {
        return NextResponse.json(
          { ok: false, error: capRes.error || "Security verification failed. Please complete the challenge." },
          { status: 400 }
        );
      }
    }

    if (!identifier || !password) {
      return NextResponse.json(
        { ok: false, error: "Please enter your Distributor ID/Email/Phone and password." },
        { status: 400 }
      );
    }

    const guardCtx = { ip, identifier: String(identifier), portal: "DISTRIBUTOR" as const };
    const rateCheck = await checkLoginGuard(guardCtx);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: `Too many failed attempts. Account locked for ${rateCheck.remainingLockoutSeconds}s.`,
        },
        { status: 429 }
      );
    }

    const cleanId = identifier.trim();

    // Query distributors table
    const distRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, registration_no, name, email, phone, password, plain_password, wallet_balance, total_commission_earned, verification_status, referral_code 
       FROM distributors 
       WHERE registration_no = ? OR email = ? OR phone = ? 
       LIMIT 1`,
      cleanId,
      cleanId,
      cleanId
    );

    if (!distRows || distRows.length === 0) {
      await recordLoginFailureGuard(guardCtx, "DISTRIBUTOR_NOT_FOUND");
      return NextResponse.json(
        { ok: false, error: "Invalid distributor credentials. Please check your Registration ID, email, or phone." },
        { status: 401 }
      );
    }

    const dist = distRows[0];

    // Check password (hash first; legacy plaintext column auto-upgrades to a hash)
    const verified = await verifyWithProgressiveRehash(String(password ?? ""), dist, {
      table: "distributors",
      idColumn: "id",
    });

    if (!verified.matched) {
      await recordLoginFailureGuard(guardCtx);
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid password. Please try again or contact the administration if you've lost access.",
        },
        { status: 401 }
      );
    }

    await recordLoginSuccessGuard(guardCtx);

    const sessionPayload: DistributorSessionData = {
      id: dist.id,
      registrationNo: dist.registration_no,
      name: dist.name || "Territory Distributor",
      email: dist.email || "",
      phone: dist.phone || "",
      walletBalance: Number(dist.wallet_balance || 0),
      totalCommissionEarned: Number(dist.total_commission_earned || 0),
      verificationStatus: dist.verification_status || "Approved",
      role: "DISTRIBUTOR",
      signedInAt: new Date().toISOString(),
    };

    const cookieVal = signHmacSession(sessionPayload as any, "DISTRIBUTOR");

    const response = NextResponse.json({
      ok: true,
      message: "Distributor authenticated successfully",
      distributor: {
        id: dist.id,
        registrationNo: dist.registration_no,
        name: dist.name,
        email: dist.email,
        phone: dist.phone,
        walletBalance: Number(dist.wallet_balance || 0),
        totalCommissionEarned: Number(dist.total_commission_earned || 0),
        verificationStatus: dist.verification_status,
      },
    });

    response.cookies.set({
      name: DISTRIBUTOR_COOKIE_NAME,
      value: cookieVal,
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
