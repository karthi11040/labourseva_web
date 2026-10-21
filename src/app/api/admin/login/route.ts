import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminSession, adminSessionCookieName } from "@/lib/admin-session";
import { verifyCaptcha } from "@/modules/captcha";
import {
  getClientIp,
  recordLoginAudit,
  analyzeLoginPattern,
  sendSuspiciousLoginEmail,
  getRecentAuditEntries,
} from "@/lib/admin-security-logger";

export const dynamic = "force-dynamic";

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "UNKNOWN";

  const configuredEmail = process.env.ADMIN_EMAIL?.trim();
  const configuredPassword = process.env.ADMIN_PASSWORD;

  if (!configuredEmail || !configuredPassword) {
    return NextResponse.json(
      { ok: false, error: "Admin credentials are not configured on the server." },
      { status: 503 }
    );
  }

  // 1. Check for Active Lockout on this IP (5+ failures in last 5 minutes)
  const recentLogs = await getRecentAuditEntries(50);
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const recentFailures = recentLogs.filter(
    (l) => l.ip === ip && l.status !== "SUCCESS" && l.unixTime >= fiveMinAgo
  );

  if (recentFailures.length >= 5) {
    await recordLoginAudit({
      ip,
      email: "N/A",
      status: "LOCKED_OUT",
      userAgent,
      reason: "IP locked out due to >= 5 consecutive failures",
    });

    const patternResult = await analyzeLoginPattern({
      ip,
      email: "N/A",
      status: "LOCKED_OUT",
      userAgent,
    });

    // Alert security email
    await sendSuspiciousLoginEmail({
      patternResult,
      ip,
      email: "N/A",
      status: "LOCKED_OUT",
      userAgent,
      reason: "Access locked for 5 minutes after repeated authentication failures.",
    });

    return NextResponse.json(
      {
        ok: false,
        error: "Too many failed attempts. Access from this IP is locked for 5 minutes for security.",
        lockedUntil: Date.now() + 5 * 60 * 1000,
      },
      { status: 429 }
    );
  }

  // 2. Parse request payload
  let body: { email?: string; password?: string; captchaToken?: string };
  try {
    body = await request.json();
  } catch {
    await recordLoginAudit({
      ip,
      email: "UNKNOWN",
      status: "INVALID_CREDENTIALS",
      userAgent,
      reason: "Malformed JSON payload",
    });
    return NextResponse.json({ ok: false, error: "Invalid request payload." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken.trim() : "";

  // 3. CAPTCHA Security Verification — Cap widget only (Cap is self-hosted,
  // privacy-first; the legacy SVG-text path is retired).
  let captchaPassed = false;
  let captchaErrorMessage = "Security verification challenge is required.";

  const verification = await verifyCaptcha(captchaToken, { ip, action: "admin_login" });
  if (verification.success) {
    captchaPassed = true;
  } else {
    captchaErrorMessage = verification.error || "Security verification failed.";
  }

  if (!captchaPassed) {
    await recordLoginAudit({
      ip,
      email: email || "ANONYMOUS",
      status: "INVALID_CAPTCHA",
      userAgent,
      reason: captchaErrorMessage,
    });

    // Analyze pattern for robotic spam
    const patternResult = await analyzeLoginPattern({
      ip,
      email: email || "ANONYMOUS",
      status: "INVALID_CAPTCHA",
      userAgent,
    });

    if (patternResult.isSuspicious) {
      await sendSuspiciousLoginEmail({
        patternResult,
        ip,
        email: email || "ANONYMOUS",
        status: "INVALID_CAPTCHA",
        userAgent,
        reason: "Failed CAPTCHA challenge during suspicious login attempt.",
      });
    }

    return NextResponse.json(
      { ok: false, error: captchaErrorMessage },
      { status: 403 }
    );
  }

  // 4. Verify Credentials in Constant Time
  const isEmailValid = safeEqual(email.toLowerCase(), configuredEmail.toLowerCase());
  const isPasswordValid = safeEqual(password, configuredPassword);

  if (!isEmailValid || !isPasswordValid) {
    await recordLoginAudit({
      ip,
      email,
      status: "INVALID_CREDENTIALS",
      userAgent,
      reason: !isEmailValid ? "Unknown administrator email" : "Incorrect password",
    });

    const patternResult = await analyzeLoginPattern({
      ip,
      email,
      status: "INVALID_CREDENTIALS",
      userAgent,
    });

    if (patternResult.isSuspicious) {
      await sendSuspiciousLoginEmail({
        patternResult,
        ip,
        email,
        status: "INVALID_CREDENTIALS",
        userAgent,
        reason: "Invalid administrator credentials submitted in suspicious pattern.",
      });
    }

    return NextResponse.json(
      { ok: false, error: "Invalid administrator credentials." },
      { status: 401 }
    );
  }

  // 5. Success — Record Audit & Check for Anomaly (e.g. New IP)
  await recordLoginAudit({
    ip,
    email,
    status: "SUCCESS",
    userAgent,
    reason: "Super administrator authenticated successfully",
  });

  const successPatternResult = await analyzeLoginPattern({
    ip,
    email,
    status: "SUCCESS",
    userAgent,
  });

  // If successfully logged in from a new/unseen IP, trigger notification email
  if (successPatternResult.isSuspicious) {
    await sendSuspiciousLoginEmail({
      patternResult: successPatternResult,
      ip,
      email,
      status: "SUCCESS",
      userAgent,
      reason: "Successful Super Admin sign-in from an unfamiliar IP address.",
    });
  }

  // 6. Set Secure HTTP-Only Cookie
  const response = NextResponse.json({ ok: true, message: "Authentication successful." });
  response.cookies.set({
    name: adminSessionCookieName,
    value: createAdminSession(),
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60, // 8 hours
  });

  return response;
}
