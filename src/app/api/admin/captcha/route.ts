import { NextResponse } from "next/server";
import { generateCaptchaCode, renderCaptchaSvg, signCaptchaChallenge } from "@/lib/admin-captcha";

export const dynamic = "force-dynamic";

export async function GET() {
  const code = generateCaptchaCode(5);
  const { token, expiresAt } = signCaptchaChallenge(code);
  const svg = renderCaptchaSvg(code);

  return NextResponse.json({
    ok: true,
    token,
    svg,
    expiresAt,
  });
}
