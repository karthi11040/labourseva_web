import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { adminSessionCookieName, isAdminSession } from "@/lib/admin-session";

export const dynamic = "force-dynamic";
const keys = ["razerpay_enabled", "razerpay_environment", "razerpay_merchant_id", "razerpay_webhook_url", "razerpay_signing_key_configured", "razerpay_last_rotated_at"];
const quote = (v: unknown) => `'${String(v ?? "").replace(/'/g, "''")}'`;
async function authorized() { return isAdminSession((await cookies()).get(adminSessionCookieName)?.value); }

export async function GET() {
  if (!await authorized()) return NextResponse.json({ ok: false, error: "Administrator authentication required." }, { status: 401 });
  try {
    const placeholders = keys.map(() => "?").join(",");
    const rows = await prisma.$queryRawUnsafe<Array<{ key_name: string; key_value: string | null }>>(
      `SELECT key_name, key_value FROM settings WHERE key_name IN (${placeholders})`,
      ...keys
    );
    const values = Object.fromEntries(rows.map((row) => [row.key_name, row.key_value || ""]));
    return NextResponse.json({
      ok: true,
      config: {
        enabled: values.razerpay_enabled === "true",
        environment: values.razerpay_environment || "sandbox",
        merchantId: values.razerpay_merchant_id || "",
        webhookUrl: values.razerpay_webhook_url || "",
        signingKeyConfigured: values.razerpay_signing_key_configured === "true",
        lastRotatedAt: values.razerpay_last_rotated_at || null,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to load Razer Pay settings." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!await authorized()) return NextResponse.json({ ok: false, error: "Administrator authentication required." }, { status: 401 });
  try {
    const body = await request.json();
    const values: Record<string, string> = {
      razerpay_enabled: body.enabled === true ? "true" : "false",
      razerpay_environment: body.environment === "production" ? "production" : "sandbox",
      razerpay_merchant_id: String(body.merchantId || "").trim(),
      razerpay_webhook_url: String(body.webhookUrl || "").trim(),
      razerpay_signing_key_configured: body.signingKeyConfigured === true ? "true" : "false",
      razerpay_last_rotated_at: String(body.lastRotatedAt || ""),
    };
    if (values.razerpay_merchant_id.length > 120 || values.razerpay_webhook_url.length > 500) {
      return NextResponse.json({ ok: false, error: "Configuration value is too long." }, { status: 400 });
    }
    for (const [key, value] of Object.entries(values)) {
      await prisma.$executeRawUnsafe(
        "INSERT INTO settings (key_name, key_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE key_value = VALUES(key_value)",
        key,
        value
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unable to save Razer Pay settings." }, { status: 400 });
  }
}

