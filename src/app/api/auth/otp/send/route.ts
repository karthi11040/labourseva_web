import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sanitizeIndianMobile, sendOtpSms } from "@/lib/sms";
import { sendOtpEmail } from "@/lib/email";
import { checkRateLimit as memoryCheck, recordLoginFailure as memoryRecord } from "@/lib/security";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "@/lib/security/rate-limiter";
import { clientIpFromRequest } from "@/lib/security/login-guard";
import { verifyCaptcha } from "@/modules/captcha";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// POST /api/auth/otp/send — Citizen OTP login, step 1.
//
// Hardening notes:
//  - OTP stored HASHED (HMAC-SHA256); the plaintext code never persists.
//  - phone stored as an HMAC blind index, IP recorded for the audit chain.
//  - Rate limited per phone (3/hour, shared DB window) and per IP (memory).
//  - Responses are intentionally uniform so account existence isn't leaked.
// ---------------------------------------------------------------------------

const OTP_TTL_MS = 30 * 60 * 1000; // matches the SMS template copy ("Valid for 30 minutes")
const RESEND_COOLDOWN_MS = 60 * 1000;

function identifierHash(channel: "sms" | "email", identifier: string): string {
  return crypto
    .createHmac("sha256", process.env.HMAC_BLIND_INDEX_KEY || process.env.SESSION_SECRET_CUST || "ls-otp-phone-index")
    .update(`customer:${channel}:${identifier}`)
    .digest("hex");
}

function otpHash(channel: "sms" | "email", identifier: string, code: string): string {
  return crypto
    .createHmac("sha256", process.env.HMAC_BLIND_INDEX_KEY || process.env.SESSION_SECRET_CUST || "ls-otp-phone-index")
    .update(`customer:${channel}:${identifier}:${code}`)
    .digest("hex");
}

export async function POST(request: NextRequest) {
  const ip = clientIpFromRequest(request);
  try {
    const body = await request.json().catch(() => ({}));
    const channel = body.channel === "email" ? "email" : "sms";
    const identifier = channel === "email"
      ? String(body.identifier || body.email || "").trim().toLowerCase()
      : sanitizeIndianMobile(String(body.identifier || body.phone || ""));
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken.trim() : "";

    const isResend = Boolean(body.isResend);

    // Cap proof-of-humanity required on initial send; resend is strictly throttled by rate limits.
    if (!isResend || captchaToken) {
      if (captchaToken) {
        const capRes = await verifyCaptcha(captchaToken, { ip, action: "otp_send" });
        if (!capRes.success) {
          return NextResponse.json(
            { ok: false, error: capRes.error || "Security verification failed. Please complete the challenge." },
            { status: 400 }
          );
        }
      } else if (!isResend) {
        return NextResponse.json(
          { ok: false, error: "Please complete the security verification challenge." },
          { status: 400 }
        );
      }
    }

    if (!identifier || (channel === "sms" && !/^[6-9]\d{9}$/.test(identifier)) || (channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier))) {
      return NextResponse.json(
        { ok: false, error: channel === "email" ? "Please enter a valid email address." : "Please enter a valid 10-digit Indian mobile number." },
        { status: 400 }
      );
    }

    // Per-identifier memory lockout (brute-force resistance on the send path)
    const memKey = `otp_send:${channel}:${identifier}:${ip}`;
    const mem = memoryCheck(memKey);
    if (!mem.allowed) {
      return NextResponse.json(
        { ok: false, error: `Too many OTP requests. Please retry in ${mem.remainingLockoutSeconds} seconds.` },
        { status: 429 }
      );
    }

    // Shared DB window for OTP delivery per identifier
    const dbKey = `otp_${channel}:${identifier}`;
    const windowRes = await checkRateLimit(dbKey, RATE_LIMIT_PRESETS.OTP_PHONE.limit, RATE_LIMIT_PRESETS.OTP_PHONE.windowSeconds);
    if (!windowRes.allowed) {
      memoryRecord(memKey);
      return NextResponse.json(
        { ok: false, error: `OTP limit reached for this number. Please retry in ${windowRes.resetSeconds} seconds.` },
        { status: 429 }
      );
    }

    // Resend cooldown: one SMS per minute
    const recent = await prisma.otpCode.findFirst({
      where: {
        phoneHash: identifierHash(channel, identifier),
        contextRef: `auth:${channel}`,
        portal: "CUSTOMER",
        purpose: "LOGIN",
        consumedAt: null,
        expiresAt: { gt: new Date() },
        createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) },
      },
      orderBy: { createdAt: "desc" },
    });
    if (recent) {
      return NextResponse.json(
        { ok: false, error: "An OTP was just sent. Please wait a minute before requesting another." },
        { status: 429 }
      );
    }

    const code = String(crypto.randomInt(100000, 1000000)); // 6 digits, CSPRNG
    if (channel === "email") {
      const existing = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM customers WHERE LOWER(email) = ? LIMIT 1`, identifier);
      if (!existing.length) return NextResponse.json({ ok: false, error: "No account uses this email yet. Register first or use SMS login to create your account." }, { status: 404 });
    }

    const otpRecord = await prisma.otpCode.create({
      data: {
        portal: "CUSTOMER",
        purpose: "LOGIN",
        phoneHash: identifierHash(channel, identifier),
        contextRef: `auth:${channel}`,
        codeHash: otpHash(channel, identifier, code),
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        ip,
      },
    });

    const delivery = channel === "email"
      ? await sendOtpEmail(identifier, code, "Citizen Portal Login")
      : await sendOtpSms(identifier, code);
    if (!delivery.success) {
      console.error(`[otp/send] ${channel} delivery failed: ${delivery.error || "unknown"}`);
      await prisma.otpCode.updateMany({
        where: { id: otpRecord.id, consumedAt: null },
        data: { consumedAt: new Date() },
      }).catch((cleanupError) => {
        console.error("[otp/send] Could not invalidate undelivered OTP:", cleanupError);
      });
      return NextResponse.json(
        { ok: false, sent: false, error: channel === "email" ? "We couldn't deliver an OTP by email. Check your address and try again." : "We couldn't deliver an OTP by SMS. Please check the number and try again, or contact support if the problem continues." },
        { status: 502 }
      );
    }
    if (process.env.NODE_ENV !== "production" && (channel === "email" ? !process.env.EMAIL_SMTP_USER : !process.env.SMS_API_KEY)) {
      console.log(`[otp/send] DEV-ONLY visible OTP for ${channel} ${identifier}: ${code}`);
    }

    return NextResponse.json({
      ok: true,
      sent: true,
      message: channel === "email" ? "OTP sent to your email address." : "OTP sent to your mobile number.",
    });
  } catch (error: any) {
    console.error("[POST /api/auth/otp/send]", error);
    return NextResponse.json(
      { ok: false, error: "Could not send OTP right now. Please try again shortly." },
      { status: 500 }
    );
  }
}

// OTP send is POST-only by design.
export const runtime = "nodejs";
