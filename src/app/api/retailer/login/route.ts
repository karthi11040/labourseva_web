import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkLoginGuard,
  recordLoginFailureGuard,
  recordLoginSuccessGuard,
  clientIpFromRequest,
} from "@/lib/security/login-guard";
import { verifyWithProgressiveRehash } from "@/lib/security/legacy-rehash";
import { RETAILER_COOKIE_NAME, RetailerSessionData } from "@/lib/retailer-session";
import { signHmacSession } from "@/lib/session-validator";
import { verifyCaptcha } from "@/modules/captcha";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = clientIpFromRequest(request);
  try {
    const body = await request.json();
    const { identifier, password, captchaToken } = body;

    // Security Verification: Validate Cap challenge only if provided
    if (captchaToken) {
      const capRes = await verifyCaptcha(captchaToken, { ip, action: "retailer_login" });
      if (!capRes.success) {
        return NextResponse.json(
          { ok: false, error: capRes.error || "Security verification failed. Please complete the challenge." },
          { status: 400 }
        );
      }
    }

    if (!identifier || !password) {
      return NextResponse.json(
        { ok: false, error: "Please enter your Kendra ID/Email/Phone and password." },
        { status: 400 }
      );
    }

    const guardCtx = { ip, identifier: String(identifier), portal: "RETAILER" as const };
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

    // Query retail_users table
    const retailers = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, registration_no, name, shop_name, email, phone, password, plain_password, wallet_balance, status, distributor_id, district_id, taluk_id, panchayat_id 
       FROM retail_users 
       WHERE registration_no = ? OR email = ? OR phone = ? 
       LIMIT 1`,
      cleanId,
      cleanId,
      cleanId
    );

    if (!retailers || retailers.length === 0) {
      await recordLoginFailureGuard(guardCtx, "RETAILER_NOT_FOUND");
      return NextResponse.json(
        { ok: false, error: "Invalid Kendra credentials. Please check your registration ID, email, or phone." },
        { status: 401 }
      );
    }

    const ret = retailers[0];

    // Check password (hash first; legacy plaintext column auto-upgrades to a hash)
    const verified = await verifyWithProgressiveRehash(String(password ?? ""), ret, {
      table: "retail_users",
      idColumn: "id",
    });

    if (!verified.matched) {
      await recordLoginFailureGuard(guardCtx);
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid password. Please try again or contact your distributor if you've lost access.",
        },
        { status: 401 }
      );
    }

    await recordLoginSuccessGuard(guardCtx);

    const sessionPayload: RetailerSessionData = {
      id: ret.id,
      registrationNo: ret.registration_no,
      name: ret.name || ret.shop_name || "Kendra Operator",
      shopName: ret.shop_name,
      email: ret.email || "",
      phone: ret.phone || "",
      distributorId: ret.distributor_id ? String(ret.distributor_id) : null,
      walletBalance: Number(ret.wallet_balance || 0),
      role: "RETAILER",
      signedInAt: new Date().toISOString(),
    };

    const cookieVal = signHmacSession(sessionPayload as any, "RETAILER");

    const response = NextResponse.json({
      ok: true,
      message: "Kendra authentication successful",
      retailer: {
        id: ret.id,
        registrationNo: ret.registration_no,
        name: ret.name,
        shopName: ret.shop_name,
        email: ret.email,
        phone: ret.phone,
        walletBalance: Number(ret.wallet_balance || 0),
        status: ret.status,
      },
      redirectUrl: Number(ret.is_approved) === 1 && String(ret.status || "").toLowerCase() === "approved"
        ? "/retailer/dashboard"
        : "/retailer/profile",
    });

    response.cookies.set({
      name: RETAILER_COOKIE_NAME,
      value: cookieVal,
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
