import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/admin-session";
import { getSecret } from "@/lib/secrets";

// ---------------------------------------------------------------------------
// Portal → cookie name / env-secret mapping
// ---------------------------------------------------------------------------

export type PortalKey =
  | "CUSTOMER"
  | "GUEST"
  | "RETAILER"
  | "DISTRIBUTOR"
  | "AGENT"
  | "EMPLOYEE"
  | "ADMIN";

/** Cookie names used by each portal's session. */
export const PORTAL_COOKIE_NAMES: Record<PortalKey, string> = {
  CUSTOMER: "labourseva-user-session",
  GUEST: "labourseva-guest-session",
  RETAILER: "labourseva-retailer-session",
  DISTRIBUTOR: "labourseva-distributor-session",
  AGENT: "labourseva-agent-session",
  EMPLOYEE: "labourseva-staff-session",
  ADMIN: "labourseva-admin-session",
};

/** Environment variable names holding per-portal session secrets. */
const PORTAL_SECRET_ENV: Record<PortalKey, string> = {
  CUSTOMER: "SESSION_SECRET_CUST",
  GUEST: "SESSION_SECRET_GUEST",
  RETAILER: "SESSION_SECRET_RET",
  DISTRIBUTOR: "SESSION_SECRET_DIST",
  AGENT: "SESSION_SECRET_AGENT",
  EMPLOYEE: "SESSION_SECRET_EMP",
  ADMIN: "SESSION_SECRET_ADMIN",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPortalSecret(portal: PortalKey): string {
  return getSecret(
    PORTAL_SECRET_ENV[portal],
    `labourseva-${portal.toLowerCase()}-fallback-secret`,
    `openssl rand -base64 32 -> ${PORTAL_SECRET_ENV[portal]}`
  );
}

/**
 * Hash a raw session token with the portal secret using HMAC-SHA256.
 * This matches the tokenHash column (Char 64) in the Session model.
 */
export function hashSessionToken(rawToken: string, portal: PortalKey): string {
  return crypto.createHmac("sha256", getPortalSecret(portal)).update(rawToken).digest("hex");
}

/**
 * Sign a payload with the portal secret using HMAC-SHA256.
 * Generates tokens in the format <base64url-payload>.<hmac-hex-signature>.
 */
export function signHmacSession(
  payload: Record<string, unknown>,
  portal: PortalKey,
  expiresInSeconds = 7 * 24 * 60 * 60 // 7 days default
): string {
  const tokenPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };
  const payloadStr = Buffer.from(JSON.stringify(tokenPayload)).toString("base64url");
  const signature = crypto.createHmac("sha256", getPortalSecret(portal)).update(payloadStr).digest("hex");
  return `${payloadStr}.${signature}`;
}

/**
 * Verify an HMAC-signed session token.
 * Validates cryptographic signature and token expiration.
 * Returns the decoded payload or null.
 */
export function verifyHmacSession(
  value: string | undefined | null,
  portal: PortalKey,
): Record<string, unknown> | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const [payloadStr, signature] = parts;
  if (!payloadStr || !signature) return null;

  const expected = crypto.createHmac("sha256", getPortalSecret(portal)).update(payloadStr).digest("hex");
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }

  try {
    const raw = Buffer.from(payloadStr, "base64url").toString("utf-8");
    const payload = JSON.parse(raw) as Record<string, unknown>;
    if (payload.exp && typeof payload.exp === "number") {
      if (Math.floor(Date.now() / 1000) > payload.exp) {
        return null; // Expired token
      }
    }
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ValidSession {
  portal: PortalKey;
  userId: string | null;
  sessionId: string;
  expiresAt: Date;
  idleExpiresAt: Date;
}

// ---------------------------------------------------------------------------
// Core validation – DB-backed portal sessions
// ---------------------------------------------------------------------------

/**
 * Read the session cookie for `portal`, look up the corresponding DB record
 * by token hash, and verify it has not expired or been revoked.
 *
 * Returns `ValidSession` on success, `null` on any failure.
 */
export async function validatePortalSession(
  cookies: Record<string, string | undefined>,
  portal: PortalKey,
): Promise<ValidSession | null> {
  const cookieName = PORTAL_COOKIE_NAMES[portal];
  const rawToken = cookies[cookieName];
  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken, portal);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
  });

  if (!session) return null;

  // Must belong to the correct portal
  if (session.portal !== portal) return null;

  // Must not be revoked
  if (session.revokedAt) return null;

  const now = new Date();

  // Hard expiry
  if (session.expiresAt <= now) return null;

  // Idle expiry
  if (session.idleExpiresAt <= now) return null;

  return {
    portal: session.portal as PortalKey,
    userId: session.userId,
    sessionId: session.id,
    expiresAt: session.expiresAt,
    idleExpiresAt: session.idleExpiresAt,
  };
}

// ---------------------------------------------------------------------------
// Legacy HMAC session validators (admin / staff)
// ---------------------------------------------------------------------------

/**
 * Validate the admin HMAC session cookie.
 * Admin sessions are time-based (no DB row) — payload contains a timestamp.
 */
export function validateAdminSession(value: string | undefined | null): boolean {
  return isAdminSession(value ?? undefined);
}

/**
 * Validate the staff (EMPLOYEE) HMAC session cookie.
 */
export function validateStaffSession(
  value: string | undefined | null,
): Record<string, unknown> | null {
  const data = verifyHmacSession(value, "EMPLOYEE");
  if (!data) return null;
  if (typeof data.exp === "number" && data.exp < Date.now()) return null;
  return data;
}

// ---------------------------------------------------------------------------
// Route → portal mapping
// ---------------------------------------------------------------------------

/** Map a URL pathname prefix to the portal that must authenticate it. */
export function portalForPath(pathname: string): PortalKey | null {
  if (pathname.startsWith("/admin")) return "ADMIN";
  if (pathname.startsWith("/staff") || pathname.startsWith("/employee")) return "EMPLOYEE";
  if (pathname.startsWith("/retailer")) return "RETAILER";
  if (pathname.startsWith("/distributor")) return "DISTRIBUTOR";
  if (pathname.startsWith("/user")) return "CUSTOMER";
  return null;
}

/** Login page each portal should redirect to when unauthenticated. */
export const PORTAL_LOGIN_URL: Record<PortalKey, string> = {
  ADMIN: "/admin/login",
  EMPLOYEE: "/staff/login",
  RETAILER: "/retailer/login",
  DISTRIBUTOR: "/distributor/login",
  CUSTOMER: "/user/login",
  GUEST: "/login",
  AGENT: "/staff/login",
};
