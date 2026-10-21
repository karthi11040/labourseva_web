import crypto from "node:crypto";
import { isAdminSession, adminSessionCookieName } from "./admin-session";
import { getSecret } from "@/lib/secrets";
import { verifyHmacSession, PORTAL_COOKIE_NAMES } from "@/lib/session-validator";

export const staffSessionCookieName = "labourseva-staff-session";

function secret(): string {
  return getSecret(
    "STAFF_SESSION_SECRET",
    process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "secure-labourseva-staff-secret-key-2026",
    "openssl rand -base64 32 -> STAFF_SESSION_SECRET"
  );
}

export interface StaffSessionData {
  id: number;
  email: string;
  name: string;
  role: "EMPLOYEE";
  department?: string;
  designation?: string;
  canVerify: boolean;
  canSign: boolean;
  exp: number;
}

export function createStaffSession(data: Omit<StaffSessionData, "exp" | "role"> & { expHours?: number }): string {
  const expHours = data.expHours || 12;
  const payload: StaffSessionData = {
    id: data.id,
    email: data.email,
    name: data.name,
    role: "EMPLOYEE",
    department: data.department || "Welfare Inspection",
    designation: data.designation || "Scrutiny Officer",
    canVerify: data.canVerify !== false,
    canSign: Boolean(data.canSign),
    exp: Date.now() + expHours * 60 * 60 * 1000,
  };

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret()).update(payloadStr).digest("hex");
  return `${payloadStr}.${signature}`;
}

export function verifyStaffSession(sessionValue: string | undefined | null): StaffSessionData | null {
  if (!sessionValue) return null;
  const [payloadStr, signature] = sessionValue.split(".");
  if (!payloadStr || !signature) return null;

  const expectedSignature = crypto.createHmac("sha256", secret()).update(payloadStr).digest("hex");
  if (
    signature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    return null;
  }

  try {
    const raw = Buffer.from(payloadStr, "base64url").toString("utf-8");
    const data = JSON.parse(raw) as StaffSessionData;
    if (!data.id || !data.exp || data.exp < Date.now()) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export interface AuthenticatedActor {
  role: "ADMIN" | "EMPLOYEE" | "CUSTOMER" | "GUEST" | "RETAILER" | "DISTRIBUTOR" | "USER" | "ANONYMOUS";
  id: string | number;
  name: string;
  email?: string;
  canVerify?: boolean;
  canSign?: boolean;
}

/**
 * Universal server-side actor resolver for route handlers.
 * Extracts identity from cookies and verified authentication headers.
 */
export function getAuthenticatedActor(request: Request): AuthenticatedActor {
  const cookieHeader = request.headers.get("cookie") || "";

  // Parse cookies robustly
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const k = trimmed.slice(0, eqIdx).trim();
      const v = trimmed.slice(eqIdx + 1).trim();
      if (k && v) {
        try {
          cookies[k] = decodeURIComponent(v);
        } catch {
          cookies[k] = v;
        }
      }
    }
  }

  // 1. Check Super Admin session (HMAC/password verified)
  const adminCookie = cookies[adminSessionCookieName] || cookies[PORTAL_COOKIE_NAMES.ADMIN];
  if (adminCookie && isAdminSession(adminCookie)) {
    return {
      role: "ADMIN",
      id: "admin-super",
      name: "Super Administrator",
      email: process.env.ADMIN_EMAIL || "admin@labourseva.tn.gov.in",
      canVerify: true,
      canSign: true,
    };
  }

  // 2. Check Employee / Staff session (HMAC verified)
  const staffCookie = cookies[staffSessionCookieName] || cookies[PORTAL_COOKIE_NAMES.EMPLOYEE];
  const staffSession = verifyStaffSession(staffCookie);
  if (staffSession) {
    return {
      role: "EMPLOYEE",
      id: staffSession.id,
      name: staffSession.name,
      email: staffSession.email,
      canVerify: staffSession.canVerify,
      canSign: staffSession.canSign,
    };
  }

  // 3. Check Retailer session (HMAC verified with RETAILER portal key)
  const retailerCookie = cookies[PORTAL_COOKIE_NAMES.RETAILER];
  if (retailerCookie) {
    const verified = verifyHmacSession(retailerCookie, "RETAILER");
    if (verified && verified.id && (verified.role === "RETAILER" || !verified.role)) {
      return {
        role: "RETAILER",
        id: verified.id as string | number,
        name: String(verified.name || verified.shopName || "Kendra Operator"),
        email: verified.email ? String(verified.email) : undefined,
      };
    }
  }

  // 4. Check Distributor session (HMAC verified with DISTRIBUTOR portal key)
  const distributorCookie = cookies[PORTAL_COOKIE_NAMES.DISTRIBUTOR];
  if (distributorCookie) {
    const verified = verifyHmacSession(distributorCookie, "DISTRIBUTOR");
    if (verified && verified.id && (verified.role === "DISTRIBUTOR" || !verified.role)) {
      return {
        role: "DISTRIBUTOR",
        id: verified.id as string | number,
        name: String(verified.name || "Territory Distributor"),
        email: verified.email ? String(verified.email) : undefined,
      };
    }
  }

  // Only accept x-user-role / x-user-id headers in automated test environments or with internal key
  const internalKey = process.env.INTERNAL_SERVICE_KEY;
  const isTestOrInternal =
    process.env.NODE_ENV === "test" ||
    process.argv.includes("--test") ||
    process.execArgv.includes("--test") ||
    (internalKey && request.headers.get("x-internal-key") === internalKey);

  if (isTestOrInternal) {
    const userHeaderRole = request.headers.get("x-user-role")?.toUpperCase();
    const userHeaderId = request.headers.get("x-user-id");
    const userHeaderName = request.headers.get("x-user-name") || "Citizen User";

    if (
      userHeaderRole &&
      userHeaderId &&
      ["CUSTOMER", "GUEST", "RETAILER", "DISTRIBUTOR", "USER"].includes(userHeaderRole)
    ) {
      return {
        role: userHeaderRole as any,
        id: userHeaderId,
        name: userHeaderName,
      };
    }
  }

  // 5. Check User / Customer session cookie (Strict HMAC verified)
  const userCookie = cookies[PORTAL_COOKIE_NAMES.CUSTOMER];
  if (userCookie) {
    const verified = verifyHmacSession(userCookie, "CUSTOMER");
    if (verified && (verified.id || verified.phone)) {
      return {
        role: (verified.role as any) || "CUSTOMER",
        id: String(verified.id || verified.customerId || verified.phone),
        name: String(verified.name || "User"),
      };
    }
  }

  return {
    role: "ANONYMOUS",
    id: "anonymous",
    name: "Anonymous Guest",
  };
}
