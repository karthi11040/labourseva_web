import { NextRequest, NextResponse } from "next/server";
import { clientIpFromRequest } from "@/lib/security/login-guard";
import { createLabourSevaCaptchaToken } from "@/modules/captcha/services/captcha-verification";

export const dynamic = "force-dynamic";

// In-memory rate limiting map for captcha challenge generation (max 60/min per IP)
const ipRequestWindow = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 60;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const current = ipRequestWindow.get(ip);

  if (!current || now - current.windowStart > RATE_LIMIT_WINDOW_MS) {
    ipRequestWindow.set(ip, { count: 1, windowStart: now });
    return false;
  }

  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  current.count += 1;
  return false;
}

// Clean up stale rate limit entries periodically
if (typeof setInterval !== "undefined") {
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of ipRequestWindow.entries()) {
      if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        ipRequestWindow.delete(ip);
      }
    }
  }, 2 * 60 * 1000);
  if (cleanup.unref) cleanup.unref();
}

/**
 * POST /api/captcha/verify
 * Native, resilient server-side security verification token generator.
 * Produces an HMAC-signed tamper-proof challenge token for LabourSeva authentication forms.
 */
export async function POST(request: NextRequest) {
  const ip = clientIpFromRequest(request);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Too many verification requests. Please wait a moment and try again.",
        errorTa: "அதிக சரிபார்ப்பு கோரிக்கைகள். சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.",
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action =
      typeof body.action === "string" && body.action.trim()
        ? body.action.trim()
        : "authentication";

    // Generate cryptographic token
    const token = createLabourSevaCaptchaToken(action, ip);

    return NextResponse.json({
      ok: true,
      token,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("[POST /api/captcha/verify]", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Could not generate security challenge. Please try again.",
        errorTa: "பாதுகாப்பு சவாலை உருவாக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
      },
      { status: 500 }
    );
  }
}
