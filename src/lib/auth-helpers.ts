import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { RETAILER_COOKIE_NAME, RetailerSessionData } from "./retailer-session";
import { DISTRIBUTOR_COOKIE_NAME, DistributorSessionData } from "./distributor-session";
import { CITIZEN_COOKIE_NAME } from "./citizen-session";
import { verifyHmacSession } from "./session-validator";

export function getCookieFromRequest(request: Request | NextRequest, cookieName: string): string | undefined {
  if ("cookies" in request && typeof (request as any).cookies?.get === "function") {
    return (request as any).cookies.get(cookieName)?.value;
  }
  const cookieHeader = request.headers.get("cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === cookieName) {
      return decodeURIComponent(v || "");
    }
  }
  return undefined;
}

function parseSessionCookie<T>(cookieValue: string | undefined, portal: "CUSTOMER" | "RETAILER" | "DISTRIBUTOR"): T | null {
  if (!cookieValue) return null;
  // Strict mode: ONLY HMAC-signed cookies are accepted. The historical
  // unsigned-JSON fallback (dev parity) is removed — it allowed any caller to
  // mint a session by setting a plain JSON cookie. Server-issued signed
  // cookies cover both password and OTP logins.
  return verifyHmacSession(cookieValue, portal) as unknown as T | null;
}

export async function getAuthRetailer(request: Request | NextRequest) {
  try {
    const cookie = getCookieFromRequest(request, RETAILER_COOKIE_NAME);
    if (!cookie) return null;
    const parsed = parseSessionCookie<RetailerSessionData>(cookie, "RETAILER");
    if (!parsed?.id) return null;

    const rows = await prisma.$queryRawUnsafe<any[]>(
      "SELECT id, registration_no, name, shop_name, email, phone, wallet_balance, status, is_approved, distributor_id, district_id, taluk_id, panchayat_id FROM retail_users WHERE id = ? LIMIT 1",
      parsed.id
    );

    if (!rows || rows.length === 0) return null;
    return rows[0];
  } catch {
    return null;
  }
}

export async function getAuthDistributor(request: Request | NextRequest) {
  try {
    const cookie = getCookieFromRequest(request, DISTRIBUTOR_COOKIE_NAME);
    if (!cookie) return null;
    const parsed = parseSessionCookie<DistributorSessionData>(cookie, "DISTRIBUTOR");
    if (!parsed?.id) return null;

    const rows = await prisma.$queryRawUnsafe<any[]>(
      "SELECT id, registration_no, name, email, phone, wallet_balance, total_commission_earned, commission_percentage, verification_status, referral_code, address FROM distributors WHERE id = ? LIMIT 1",
      parsed.id
    );

    if (!rows || rows.length === 0) return null;
    return rows[0];
  } catch {
    return null;
  }
}

export interface CitizenIdentity {
  customerId: number | null;
  phone: string;
  name: string;
  email: string;
  districtId: number | null;
  talukId: number | null;
  panchayatId: number | null;
}

// Legacy customer rows hold PHP-era ciphertext that this app cannot decrypt.
function plainText(value: unknown): string {
  const v = String(value ?? "").trim();
  if (!v) return "";
  if (!v.includes(" ") && v.length >= 20 && /^[A-Za-z0-9+/]+=*$/.test(v)) return "";
  return v;
}

export async function getCitizenIdentity(request: Request | NextRequest): Promise<CitizenIdentity | null> {
  const cookie = getCookieFromRequest(request, CITIZEN_COOKIE_NAME);
  if (!cookie) return null;

  const parsed = parseSessionCookie<any>(cookie, "CUSTOMER");
  if (!parsed) return null;

  const phone = String(parsed?.phone || parsed?.id || "").replace(/\D/g, "").slice(-10);
  if (!/^\d{10}$/.test(phone)) return null;

  const rows = await prisma
    .$queryRawUnsafe<any[]>(
      "SELECT id, full_name, email, dist_id, taluk_id, panchayath_id FROM customers WHERE phone = ? ORDER BY id DESC LIMIT 1",
      phone
    )
    .catch(() => []);
  const row = rows[0];

  const email = plainText(row?.email);
  return {
    customerId: row ? Number(row.id) : (parsed.customerId ?? parsed.id ? Number(parsed.customerId ?? parsed.id) : null),
    phone,
    name: plainText(row?.full_name) || plainText(parsed?.name) || "Citizen Beneficiary",
    email: email.includes("@") ? email : "",
    districtId: row?.dist_id ? Number(row.dist_id) : null,
    talukId: row?.taluk_id ? Number(row.taluk_id) : null,
    panchayatId: row?.panchayath_id ? Number(row.panchayath_id) : null,
  };
}

export async function getAuthCustomer(request: Request | NextRequest) {
  try {
    const cookie = getCookieFromRequest(request, CITIZEN_COOKIE_NAME);
    if (!cookie) return null;
    const parsed = parseSessionCookie<any>(cookie, "CUSTOMER");
    if (!parsed) return null;
    const idOrPhone = parsed.id || parsed.phone;
    if (!idOrPhone) return null;

    let rows: any[] = [];
    if (typeof idOrPhone === "number" || /^\d+$/.test(idOrPhone)) {
      rows = await prisma.$queryRawUnsafe<any[]>(
        "SELECT id, registration_no, full_name, email, phone, wallet, status, verification_status FROM customers WHERE id = ? OR phone = ? LIMIT 1",
        idOrPhone,
        idOrPhone
      );
    }

    if (!rows || rows.length === 0) {
      return null;
    }
    return rows[0];
  } catch {
    return null;
  }
}


