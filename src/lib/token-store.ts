/**
 * LabourSeva — Unified Cryptographic Token Store
 * Handles single-use, time-limited Email Verification & Password Reset tokens.
 * Backed by MySQL `password_resets` table with in-memory fallback.
 */
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/security";

export interface StoredTokenData {
  identifier: string; // Email or user reference
  userId?: string | number;
  purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET";
  tokenHash: string;
  expiresAt: Date;
  used: boolean;
}

// In-memory cache for speed, tests, and database-offline tolerance
const memoryTokenStore = new Map<string, StoredTokenData>();

// Short-lived cache of recently consumed tokens (prevents race condition failures from browser link prefetching and React StrictMode double mounts)
interface ConsumedTokenAudit {
  identifier: string;
  userId?: string | number;
  consumedAt: number;
}
const recentlyConsumedTokens = new Map<string, ConsumedTokenAudit>();

// Prune consumed tokens older than 5 minutes periodically
function pruneConsumedTokens() {
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [key, val] of recentlyConsumedTokens.entries()) {
    if (val.consumedAt < cutoff) {
      recentlyConsumedTokens.delete(key);
    }
  }
}

/**
 * Creates a cryptographically random, single-use, time-limited token
 */
export async function createSecurityToken(params: {
  identifier: string;
  userId?: string | number;
  purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET";
  expiresInMinutes?: number;
}): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashPassword(rawToken);
  const minutes = params.expiresInMinutes || (params.purpose === "EMAIL_VERIFICATION" ? 24 * 60 : 15);
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

  // 1. Save in memory store
  const tokenKey = `${params.purpose}:${rawToken}`;
  memoryTokenStore.set(tokenKey, {
    identifier: params.identifier.toLowerCase().trim(),
    userId: params.userId,
    purpose: params.purpose,
    tokenHash,
    expiresAt,
    used: false,
  });

  // 2. Persist in MySQL `password_resets` table
  try {
    const rawUserId = params.userId ? (typeof params.userId === "number" ? params.userId : 1) : 1;
    const dbTokenKey = crypto.createHash("sha256").update(tokenKey).digest("hex");
    await prisma.$executeRawUnsafe(
      `INSERT INTO password_resets (user_id, token, code_hash, identifier, expires_at, created_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), NOW())`,
      rawUserId,
      dbTokenKey,
      tokenHash,
      params.identifier.toLowerCase().trim(),
      minutes
    );
  } catch (err: any) {
    // Non-blocking warning: memory store acts as safety net
    console.warn(`[TokenStore Warning] DB insert fallback for ${params.purpose}:`, err?.message || err);
  }

  return rawToken;
}

/**
 * Validates a single-use token.
 * If valid and consume=true, marks token as consumed immediately (idempotency/single-use).
 */
export async function validateSecurityToken(params: {
  rawToken?: string;
  token?: string;
  purpose: "EMAIL_VERIFICATION" | "PASSWORD_RESET";
  consume?: boolean;
}): Promise<{
  valid: boolean;
  alreadyConsumed?: boolean;
  identifier?: string;
  userId?: string | number;
  error?: string;
}> {
  pruneConsumedTokens();
  const actualToken = String(params.rawToken || params.token || "").trim();
  const tokenKey = `${params.purpose}:${actualToken}`;
  const now = new Date();

  // 1. Check in-memory store first
  const mem = memoryTokenStore.get(tokenKey);
  if (mem) {
    if (mem.used) {
      return {
        valid: false,
        alreadyConsumed: true,
        identifier: mem.identifier,
        userId: mem.userId,
        error: "This token has already been used.",
      };
    }
    if (mem.expiresAt < now) {
      memoryTokenStore.delete(tokenKey);
      return { valid: false, error: "This token has expired. Please request a new one." };
    }
    if (params.consume) {
      mem.used = true;
      memoryTokenStore.set(tokenKey, mem);
      recentlyConsumedTokens.set(tokenKey, {
        identifier: mem.identifier,
        userId: mem.userId,
        consumedAt: Date.now(),
      });
    }
    return { valid: true, identifier: mem.identifier, userId: mem.userId };
  }

  // 2. Check recently consumed cache (handles tokens consumed via DB)
  const recent = recentlyConsumedTokens.get(tokenKey);
  if (recent && Date.now() - recent.consumedAt < 120_000) {
    return {
      valid: false,
      alreadyConsumed: true,
      identifier: recent.identifier,
      userId: recent.userId,
      error: "This token has already been consumed.",
    };
  }

  // 3. Check MySQL database
  try {
    const dbTokenKey = crypto.createHash("sha256").update(tokenKey).digest("hex");
    const records = await prisma.$queryRawUnsafe<any[]>(
      `SELECT *, (expires_at < NOW()) AS is_expired FROM password_resets WHERE token = ? OR token = ? LIMIT 1`,
      dbTokenKey,
      actualToken
    );

    if (!records || records.length === 0) {
      return { valid: false, error: "Invalid token or token has already been consumed." };
    }

    const row = records[0];
    const isExpired = Boolean(Number(row.is_expired) === 1 || new Date(row.expires_at) < now);

    if (isExpired) {
      await prisma.$executeRawUnsafe(`DELETE FROM password_resets WHERE id = ?`, row.id).catch(() => {});
      return { valid: false, error: "This token has expired. Please request a new one." };
    }

    if (params.consume) {
      recentlyConsumedTokens.set(tokenKey, {
        identifier: row.identifier,
        userId: row.user_id,
        consumedAt: Date.now(),
      });
      await prisma.$executeRawUnsafe(`DELETE FROM password_resets WHERE id = ?`, row.id).catch(() => {});
    }

    return {
      valid: true,
      identifier: row.identifier,
      userId: row.user_id,
    };
  } catch (err: any) {
    return { valid: false, error: "Token verification failed. Please try again." };
  }
}
