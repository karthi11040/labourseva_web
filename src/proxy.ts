import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  portalForPath,
  PORTAL_COOKIE_NAMES,
  PORTAL_LOGIN_URL,
  validatePortalSession,
  validateAdminSession,
  validateStaffSession,
  verifyHmacSession,
  type PortalKey,
} from "@/lib/session-validator";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Central edge proxy (Next.js 16 "proxy" = middleware).
//
// Responsibilities
//  1. Portal route guarding   — redirect unauthenticated users to their login.
//  2. CSRF enforcement        — Origin/Referer check on every state-changing
//                               /api request that carries session cookies.
//  3. Citizen upload guard    — legacy docs under /assets/uploads/services
//                               require auth + ownership instead of public URL
//                               serving. URLs do not change for the app.
//
// Compatibility guarantees for the live rollout:
//  - Cookie names, HMAC formats and JSON payload shapes are unchanged.
//  - Unsigned JSON cookies are NO LONGER accepted anywhere (they never worked
//    in production HMAC mode; dev parity sessions need one re-login).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Paths that never require authentication
// ---------------------------------------------------------------------------

/** Login / public pages that are always accessible. */
const PUBLIC_PATHS = [
  "/admin/login",
  "/staff/login",
  "/staff/forgot-password",
  "/staff/reset-password",
  "/employee/login",
  "/retailer/login",
  "/distributor/login",
  "/user/login",
  "/login",
  "/register",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Prefix of citizen document uploads guarded by ownership checks. */
const CITIZEN_UPLOAD_PREFIX = "/assets/uploads/services/";

/** Paths authenticated by other means (signature/IP), exempt from CSRF Origin checks. */
const CSRF_EXEMPT_PATHS = ["/api/payments/razorpay/webhook"];

// ---------------------------------------------------------------------------
// Cookie + request helpers
// ---------------------------------------------------------------------------

function parseCookies(request: NextRequest): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const cookie of request.cookies.getAll()) {
    result[cookie.name] = cookie.value;
  }
  return result;
}

/** All authentication cookies assumed to grant ambient credentials. */
const AUTH_COOKIE_NAMES = Object.values(PORTAL_COOKIE_NAMES).concat("labourseva-agent-session");

function hasAnySessionCookie(cookies: Record<string, string | undefined>): boolean {
  return AUTH_COOKIE_NAMES.some((name) => Boolean(cookies[name]));
}

// ---------------------------------------------------------------------------
// CSRF enforcement (same-origin policy for unsafe methods)
// ---------------------------------------------------------------------------

function hostFromSameSiteHeader(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

/**
 * Enforce same-origin for state-changing /api requests that ride on session
 * cookies. Browsers always attach Origin on POST/PATCH/PUT/DELETE fetches and
 * form posts, so legitimate same-app traffic passes without any frontend
 * changes; cross-site cookie attacks are rejected with 403.
 */
function csrfCheck(request: NextRequest, cookies: Record<string, string | undefined>): NextResponse | null {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;

  const pathname = request.nextUrl.pathname;
  if (CSRF_EXEMPT_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;

  // No ambient credentials -> no CSRF risk (webhook callers, API clients).
  if (!hasAnySessionCookie(cookies)) return null;

  const requestHost = request.headers.get("host");
  const originHost = hostFromSameSiteHeader(request.headers.get("origin"));
  const refererHost = hostFromSameSiteHeader(request.headers.get("referer"));

  if (!requestHost) {
    // Host header missing => malformed request, reject for cookie-bearing calls.
    return jsonForbidden("CSRF validation failed: missing request host.");
  }

  if (originHost === requestHost || refererHost === requestHost) return null;

  return jsonForbidden(
    "CSRF validation failed: cross-origin request with session credentials. " +
      "Initiate requests from the application itself."
  );
}

function jsonForbidden(message: string): NextResponse {
  return NextResponse.json(
    { ok: false, error: message },
    {
      status: 403,
      headers: { "x-robots-tag": "noindex" },
    }
  );
}

// ---------------------------------------------------------------------------
// Portal session check
// ---------------------------------------------------------------------------

async function isPortalAuthenticated(
  cookies: Record<string, string | undefined>,
  portal: PortalKey,
): Promise<boolean> {
  // Admin and Staff use HMAC-signed cookies
  if (portal === "ADMIN") {
    return validateAdminSession(cookies["labourseva-admin-session"]);
  }

  if (portal === "EMPLOYEE") {
    // Staff can also be authenticated via admin session (super-admin access)
    if (validateAdminSession(cookies["labourseva-admin-session"])) return true;
    return validateStaffSession(cookies["labourseva-staff-session"]) !== null;
  }

  if (portal === "CUSTOMER") {
    const userCookie = cookies["labourseva-user-session"];
    if (!userCookie) return false;
    const verified = verifyHmacSession(userCookie, "CUSTOMER");
    return Boolean(verified && (verified.phone || verified.id || verified.customerId));
  }

  if (portal === "RETAILER") {
    const retCookie = cookies["labourseva-retailer-session"];
    if (!retCookie) return false;
    const verified = verifyHmacSession(retCookie, "RETAILER");
    return Boolean(verified && (verified.id || verified.role === "RETAILER"));
  }

  if (portal === "DISTRIBUTOR") {
    const distCookie = cookies["labourseva-distributor-session"];
    if (!distCookie) return false;
    const verified = verifyHmacSession(distCookie, "DISTRIBUTOR");
    return Boolean(verified && (verified.id || verified.role === "DISTRIBUTOR"));
  }

  // Fallback to DB-backed session validation if configured
  try {
    const session = await validatePortalSession(cookies, portal);
    return session !== null;
  } catch {
    return false;
  }
}

async function hasSubmittedCitizenProfile(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  const session = verifyHmacSession(cookieValue, "CUSTOMER");
  const phone = String(session?.phone || session?.id || "").replace(/\D/g, "").slice(-10);
  if (!/^\d{10}$/.test(phone)) return false;
  try {
    const customers = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, verification_status FROM customers WHERE phone = ? ORDER BY id DESC LIMIT 1`, phone
    );
    const customer = customers[0];
    if (!customer) return false;
    const submitted = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM kyc_audit_logs WHERE user_type = 'customer' AND user_id = ? AND action_performed = 'submit_verification' ORDER BY id DESC LIMIT 1`,
      customer.id
    );
    return submitted.length > 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Citizen uploads guard (legacy PDF receipts / signed applications)
// ---------------------------------------------------------------------------

function isStaffLevelAuthenticated(
  cookies: Record<string, string | undefined>,
): boolean {
  if (validateAdminSession(cookies["labourseva-admin-session"])) return true;
  if (validateStaffSession(cookies["labourseva-staff-session"])) return true;
  const ret = verifyHmacSession(cookies["labourseva-retailer-session"], "RETAILER");
  if (ret && (ret.id || ret.role === "RETAILER")) return true;
  const dist = verifyHmacSession(cookies["labourseva-distributor-session"], "DISTRIBUTOR");
  if (dist && (dist.id || dist.role === "DISTRIBUTOR")) return true;
  return false;
}

async function guardCitizenUpload(
  request: NextRequest,
  pathname: string,
  cookies: Record<string, string | undefined>,
): Promise<NextResponse | null> {
  if (!pathname.startsWith(CITIZEN_UPLOAD_PREFIX)) return null;

  // Staff / franchise roles can view all application documents.
  const staffOk = isStaffLevelAuthenticated(cookies);

  // Citizens must own the exact application whose file is requested.
  let citizenOk = false;
  const citizen = verifyHmacSession(cookies["labourseva-user-session"], "CUSTOMER");
  if (citizen) {
    const customerId = Number(citizen.customerId ?? (typeof citizen.id === "number" ? citizen.id : NaN));
    if (Number.isFinite(customerId) && customerId > 0) {
      try {
        const rows = await prisma.$queryRawUnsafe<any[]>(
          `SELECT id FROM service_requests WHERE uploaded_doc_path = ? AND (customer_id = ? OR user_id = ?) LIMIT 1`,
          pathname,
          customerId,
          customerId
        );
        citizenOk = Boolean(rows && rows.length > 0);
      } catch {
        citizenOk = false;
      }
    }
  }

  if (staffOk) return null; // request continues normally

  if (!citizenOk) {
    if (citizen) {
      // Authenticated citizen but not the owner — explicit denial.
      return jsonForbidden("You are not authorized to view this document.");
    }
    return NextResponse.redirect(new URL("/user/login?redirect=" + encodeURIComponent(pathname), request.url));
  }

  return null;
}

// ---------------------------------------------------------------------------
// Proxy function (Next.js 16 — replaces deprecated middleware)
// ---------------------------------------------------------------------------

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookies = parseCookies(request);

  // --- CSRF (API) ----------------------------------------------------------
  if (pathname.startsWith("/api/")) {
    const blocked = csrfCheck(request, cookies);
    if (blocked) return blocked;
  }

  // --- Citizen uploads (ownership-gated serving) ----------------------------
  if (pathname.startsWith(CITIZEN_UPLOAD_PREFIX)) {
    const denied = await guardCitizenUpload(request, pathname, cookies);
    if (denied) return denied;
    return NextResponse.next();
  }

  // --- Portal pages ----------------------------------------------------------
  const portal = portalForPath(pathname);

  // No portal prefix → public route, pass through
  if (!portal) return NextResponse.next();

  // Login / public pages for this portal are always accessible
  if (isPublicPath(pathname)) return NextResponse.next();

  // Check authentication
  const authenticated = await isPortalAuthenticated(cookies, portal);

  if (authenticated) {
    if (portal === "CUSTOMER" && pathname.startsWith("/user/") &&
        !["/user/profile", "/user/account-status", "/user/login"].some((allowed) => pathname === allowed || pathname.startsWith(`${allowed}/`))) {
      const complete = await hasSubmittedCitizenProfile(cookies["labourseva-user-session"]);
      if (!complete) return NextResponse.redirect(new URL("/user/profile", request.url));
    }
    return NextResponse.next();
  }

  // Redirect to the appropriate login page
  const loginUrl = new URL(PORTAL_LOGIN_URL[portal], request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

// ---------------------------------------------------------------------------
// Matcher — portal pages, API routes, and guarded uploads
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    "/admin/:path*",
    "/staff/:path*",
    "/employee/:path*",
    "/retailer/:path*",
    "/distributor/:path*",
    "/user/:path*",
    "/api/:path*",
    "/assets/uploads/services/:path*",
  ],
};
