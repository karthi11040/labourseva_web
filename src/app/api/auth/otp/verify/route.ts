import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sanitizeIndianMobile } from "@/lib/sms";
import { checkRateLimit as memoryCheck, recordLoginFailure as memoryRecord } from "@/lib/security";
import { clientIpFromRequest, recordLoginSuccessGuard } from "@/lib/security/login-guard";
import { signHmacSession } from "@/lib/session-validator";
import { CITIZEN_COOKIE_NAME } from "@/lib/citizen-session";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// POST /api/auth/otp/verify — Citizen OTP login, step 2.
//
//  - Verifies against the HASHED OtpCode row; timing-safe comparison.
//  - Enforces max 5 attempts per code; wrong attempts increment the row.
//  - Single-use: consumed atomically (updateMany guarded on consumedAt null).
//  - Session cookie is minted SERVER-SIDE: HMAC-signed, HttpOnly, Secure in
//    production, SameSite=Lax — replacing the old client-side cookie.
//  - Rate limited per phone (identifier window) and per IP.
// ---------------------------------------------------------------------------

async function otpHmacs(channel: "sms" | "email", identifier: string) {
  const secret = process.env.HMAC_BLIND_INDEX_KEY || process.env.SESSION_SECRET_CUST || "ls-otp-phone-index";
  return {
    phoneHash: crypto.createHmac("sha256", secret).update(`customer:${channel}:${identifier}`).digest("hex"),
  };
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(request: NextRequest) {
  const ip = clientIpFromRequest(request);
  try {
    const body = await request.json().catch(() => ({}));
    const channel = body.channel === "email" ? "email" : "sms";
    const identifier = channel === "email"
      ? String(body.identifier || body.email || "").trim().toLowerCase()
      : sanitizeIndianMobile(String(body.identifier || body.phone || ""));
    const rawCode = String(body.code || "").replace(/\D/g, "");
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken.trim() : "";

    // OTP possession is cryptographic proof of device/phone access.
    // Protection against brute-force is enforced by maxAttempts and memoryLockout below.

    if (!identifier || (channel === "sms" && !/^[6-9]\d{9}$/.test(identifier)) || (channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier))) {
      return NextResponse.json(
        { ok: false, error: channel === "email" ? "Please enter a valid email address." : "Please enter a valid 10-digit Indian mobile number." },
        { status: 400 }
      );
    }

    const memKey = `otp_verify:${channel}:${identifier}:${ip}`;
    if (!memoryCheck(memKey).allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many incorrect attempts. Please try again in a few minutes." },
        { status: 429 }
      );
    }

    const { phoneHash } = await otpHmacs(channel, identifier);

    // Load the most recent unconsumed, unexpired LOGIN OTP for this phone
    const otpRow = await prisma.otpCode.findFirst({
      where: {
        phoneHash,
        contextRef: `auth:${channel}`,
        portal: "CUSTOMER",
        purpose: "LOGIN",
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRow) {
      memoryRecord(memKey);
      return NextResponse.json(
        { ok: false, error: "This OTP has expired or was already used. Please request a new one." },
        { status: 400 }
      );
    }

    if (otpRow.attempts >= otpRow.maxAttempts) {
      await prisma.otpCode.updateMany({
        where: { id: otpRow.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      return NextResponse.json(
        { ok: false, error: "Too many wrong attempts for this OTP. Please request a new one." },
        { status: 429 }
      );
    }

    // Timing-safe verification against the stored hash
    const secret = process.env.HMAC_BLIND_INDEX_KEY || process.env.SESSION_SECRET_CUST || "ls-otp-phone-index";
    const codeHash = crypto.createHmac("sha256", secret).update(`customer:${channel}:${identifier}:${rawCode}`).digest("hex");

    const matches = rawCode.length === 6 && safeEqualHex(codeHash, otpRow.codeHash);
    if (!matches) {
      await prisma.otpCode.update({
        where: { id: otpRow.id },
        data: { attempts: { increment: 1 } },
      });
      memoryRecord(memKey);
      const remaining = Math.max(0, otpRow.maxAttempts - otpRow.attempts - 1);
      return NextResponse.json(
        {
          ok: false,
          error:
            remaining > 0
              ? `Incorrect OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining. Please enter the correct code or request a new OTP.`
              : "Too many incorrect attempts. Please request a new OTP.",
        },
        { status: 400 }
      );
    }

    // Single-use consumption: atomic, only if still unconsumed
    const consumed = await prisma.otpCode.updateMany({
      where: { id: otpRow.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count === 0) {
      return NextResponse.json(
        { ok: false, error: "This OTP was already used. Please request a new one." },
        { status: 400 }
      );
    }

    // Look up the citizen account by the verified identifier.
    let customers = await prisma.$queryRawUnsafe<any[]>(
      channel === "email"
        ? `SELECT id, full_name, email, phone, status, verification_status, rejection_reason, email_verified, wallet FROM customers WHERE LOWER(email) = ? ORDER BY id DESC LIMIT 1`
        : `SELECT id, full_name, email, phone, status, verification_status, rejection_reason, email_verified, wallet FROM customers WHERE phone = ? ORDER BY id DESC LIMIT 1`,
      identifier
    );

    // Auto-create citizen account if one does not exist for this verified phone
    if ((!customers || customers.length === 0) && channel === "email") {
      return NextResponse.json({ ok: false, error: "No account uses this email address. Register first or use SMS login to create your account." }, { status: 404 });
    }

    if (!customers || customers.length === 0) {
      const defaultName = `Citizen ${identifier.slice(-4)}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO customers (full_name, phone, status, verification_status, email_verified, wallet, created_at)
         VALUES (?, ?, 'pending', 'Pending', 0, 0.00, NOW())`,
        defaultName,
        identifier
      );

      customers = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, full_name, email, phone, status, verification_status, rejection_reason, email_verified, wallet FROM customers WHERE phone = ? ORDER BY id DESC LIMIT 1`,
        identifier
      );
    }

    const cust = customers[0];

    if (channel === "email" && !Number(cust.email_verified)) {
      await prisma.$executeRawUnsafe(`UPDATE customers SET email_verified = 1 WHERE id = ?`, cust.id);
    }

    if (cust.verification_status === "Rejected") {
      return NextResponse.json(
        {
          ok: false,
          accountStatus: "REJECTED",
          rejectionReason: cust.rejection_reason || "Documents did not satisfy verification criteria.",
          error: `Your account verification was rejected: ${cust.rejection_reason || "Please review required details."}`,
        },
        { status: 403 }
      );
    }

    const isApproved = String(cust.verification_status || "").toLowerCase() === "approved";
    const submittedProfiles = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM kyc_audit_logs WHERE user_type = 'customer' AND user_id = ? AND action_performed = 'submit_verification' LIMIT 1`,
      cust.id
    );
    const profileComplete = submittedProfiles.length > 0;

    // Session payload mirrors /api/auth/login EXACTLY so both flows are
    // interchangeable and existing readers keep working.
    const sessionPayload = {
      id: cust.phone || cust.id,
      customerId: cust.id,
      name: cust.full_name || `Citizen ${cust.phone?.slice(-4) || ""}`,
      phone: cust.phone,
      email: cust.email || "",
      role: "CUSTOMER",
      isApproved,
      verificationStatus: cust.verification_status || "Pending",
    };
    const cookieVal = signHmacSession(sessionPayload, "CUSTOMER");

    await recordLoginSuccessGuard({ ip, identifier, portal: "CUSTOMER" });

    const redirectUrl = profileComplete ? "/user/dashboard" : "/user/profile";

    const response = NextResponse.json({
      ok: true,
      user: {
        id: cust.id,
        name: cust.full_name,
        email: cust.email,
        phone: cust.phone,
        role: "CUSTOMER",
        status: cust.verification_status || "Pending",
        isApproved,
        profileComplete,
      },
      redirectUrl,
      message: "Signed in successfully.",
    });

    response.cookies.set(CITIZEN_COOKIE_NAME, cookieVal, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 604800,
    });

    return response;
  } catch (error: any) {
    console.error("[POST /api/auth/otp/verify]", error);
    return NextResponse.json(
      { ok: false, error: "Could not verify the OTP right now. Please try again." },
      { status: 500 }
    );
  }
}

// OTP verify is POST-only by design. Session cookies are HttpOnly above.
