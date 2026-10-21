import crypto from "node:crypto";
import {
  checkRateLimit as memoryCheck,
  recordLoginFailure as memoryRecord,
  clearLoginFailures as memoryClear,
} from "@/lib/security";
import {
  checkRateLimit,
  incrementRateLimit,
  resetRateLimit,
  RATE_LIMIT_PRESETS,
} from "@/lib/security/rate-limiter";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Hybrid login guard.
//
// Layer 1 (in-memory, from @/lib/security): 5 failures -> 15 min lock. Zero
// latency, unchanged behavior for every existing caller.
//
// Layer 2 (database, RateLimitBucket table): sliding-window counters shared
// across instances and restarts. Read is non-incremental via checkRateLimit();
// writes happen only on failures/success resets.
//
// Availability rule: every DB call is best-effort. If the DB layer errors the
// request still works (layer 1 remains). A rate limiter must never cause an
// outage on a live portal.
// ---------------------------------------------------------------------------

export interface LoginGuardContext {
  /** Client IP (best-effort from proxy headers). */
  ip: string;
  /** Login identifier as typed (email/phone). Hashed before touching DB. */
  identifier: string;
  /** Portal for the audit row. */
  portal: "CUSTOMER" | "RETAILER" | "DISTRIBUTOR" | "EMPLOYEE" | "ADMIN";
}

export interface LoginGuardResult {
  allowed: boolean;
  reason?: string;
  remainingLockoutSeconds?: number;
}

/** Blind index for identifiers in audit/rate-limit keys. */
function blindIndex(identifier: string): string {
  return crypto
    .createHmac("sha256", process.env.HMAC_BLIND_INDEX_KEY || "ls-login-blind-index")
    .update(identifier.trim().toLowerCase())
    .digest("hex");
}

/**
 * Pre-login check. Runs the memory lockout first (cheapest), then the shared
 * DB windows. DB failures never block.
 */
export async function checkLoginGuard(ctx: LoginGuardContext): Promise<LoginGuardResult> {
  const memKey = `${ctx.portal.toLowerCase()}:${ctx.identifier.toLowerCase()}:${ctx.ip}`;
  const mem = memoryCheck(memKey);
  if (!mem.allowed) {
    return {
      allowed: false,
      reason: "ACCOUNT_LOCKED",
      remainingLockoutSeconds: mem.remainingLockoutSeconds,
    };
  }

  try {
    const idKey = `login:id:${blindIndex(ctx.identifier)}`;
    const idRes = await checkRateLimit(idKey, RATE_LIMIT_PRESETS.LOGIN_IDENTIFIER.limit, RATE_LIMIT_PRESETS.LOGIN_IDENTIFIER.windowSeconds);
    if (!idRes.allowed) {
      return {
        allowed: false,
        reason: "IDENTIFIER_RATE_LIMITED",
        remainingLockoutSeconds: idRes.resetSeconds,
      };
    }

    const ipKey = `login:ip:${ctx.ip}`;
    const ipRes = await checkRateLimit(ipKey, RATE_LIMIT_PRESETS.LOGIN_IP.limit, RATE_LIMIT_PRESETS.LOGIN_IP.windowSeconds);
    if (!ipRes.allowed) {
      return {
        allowed: false,
        reason: "IP_RATE_LIMITED",
        remainingLockoutSeconds: ipRes.resetSeconds,
      };
    }
  } catch {
    // DB layer unavailable — memory layer already passed; keep the flow alive.
  }

  return { allowed: true };
}

/**
 * Called when authentication fails. Increments both layers and writes an
 * audit row (never throws).
 */
export async function recordLoginFailureGuard(ctx: LoginGuardContext, reason = "BAD_CREDENTIALS"): Promise<void> {
  const memKey = `${ctx.portal.toLowerCase()}:${ctx.identifier.toLowerCase()}:${ctx.ip}`;
  memoryRecord(memKey);

  try {
    const idKey = `login:id:${blindIndex(ctx.identifier)}`;
    await Promise.allSettled([
      incrementRateLimit(idKey, RATE_LIMIT_PRESETS.LOGIN_IDENTIFIER.windowSeconds),
      incrementRateLimit(`login:ip:${ctx.ip}`, RATE_LIMIT_PRESETS.LOGIN_IP.windowSeconds),
    ]);
    await prisma.loginAttempt
      .create({
        data: {
          portal: ctx.portal,
          identifierHash: blindIndex(ctx.identifier),
          success: false,
          reason,
          ip: ctx.ip,
        },
      })
      .catch(() => {});
  } catch {
    // Swallow — audit/logging must not break the auth flow.
  }
}

/**
 * Called when authentication succeeds. Clears both layers and records the
 * successful attempt (never throws).
 */
export async function recordLoginSuccessGuard(ctx: LoginGuardContext): Promise<void> {
  const memKey = `${ctx.portal.toLowerCase()}:${ctx.identifier.toLowerCase()}:${ctx.ip}`;
  memoryClear(memKey);

  try {
    const idKey = `login:id:${blindIndex(ctx.identifier)}`;
    await Promise.allSettled([
      resetRateLimit(idKey),
      resetRateLimit(`login:ip:${ctx.ip}`),
    ]);
    await prisma.loginAttempt
      .create({
        data: {
          portal: ctx.portal,
          identifierHash: blindIndex(ctx.identifier),
          success: true,
          reason: "LOGIN_OK",
          ip: ctx.ip,
        },
      })
      .catch(() => {});
  } catch {
    // Swallow.
  }
}

/** Extract the best-effort client IP (Cloudflare -> XFF chain -> socket). */
export function clientIpFromRequest(request: { headers: Headers }): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.split(",")[0].trim();
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "127.0.0.1";
}
