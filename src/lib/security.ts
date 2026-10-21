import crypto from "node:crypto";

import bcrypt from "bcryptjs";

/**
 * Modern password hashing using Node's built-in scrypt algorithm.
 * Format: scrypt:<salt_hex>:<derived_key_hex>
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derivedKey}`;
}

/**
 * Verifies a plaintext password against a stored password hash.
 * Supports modern scrypt hashes, bcrypt hashes ($2y$, $2a$, $2b$), and direct match.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !password) return false;

  if (storedHash.startsWith("scrypt:")) {
    const [, salt, expectedHash] = storedHash.split(":");
    if (!salt || !expectedHash) return false;
    const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
    const a = Buffer.from(derivedKey, "hex");
    const b = Buffer.from(expectedHash, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  // Handle bcrypt hashes (PHP standard $2y$ or $2a$ or $2b$)
  if (storedHash.startsWith("$2y$") || storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$")) {
    try {
      const normalized = storedHash.replace(/^\$2y\$/, "$2a$");
      return bcrypt.compareSync(password, normalized);
    } catch {
      return false;
    }
  }

  // SECURITY: no plaintext fallback. Unrecognized formats always fail closed.
  // (DB audit July 2026: every customers/retail_users/distributors password row
  // is bcrypt or empty — plaintext acceptance was dead code and a footgun.)
  return false;
}

/**
 * Generate a cryptographically secure random token (hex string).
 */
export function generateSecureToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString("hex");
}

/**
 * In-memory / fast rate limiter for brute-force login protection.
 * Maximum 5 failed attempts within 15 minutes.
 */
interface RateLimitRecord {
  attempts: number;
  lockedUntil: number;
  lastAttempt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(key: string): { allowed: boolean; remainingLockoutSeconds?: number } {
  const record = rateLimitMap.get(key);
  if (!record) return { allowed: true };

  const now = Date.now();
  if (record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingLockoutSeconds: remainingSeconds };
  }

  // Reset if window has passed
  if (now - record.lastAttempt > LOCKOUT_MS) {
    rateLimitMap.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordLoginFailure(key: string): { locked: boolean; remainingAttempts: number; lockoutSeconds?: number } {
  const now = Date.now();
  let record = rateLimitMap.get(key);

  if (!record || now - record.lastAttempt > LOCKOUT_MS) {
    record = { attempts: 1, lockedUntil: 0, lastAttempt: now };
  } else {
    record.attempts += 1;
    record.lastAttempt = now;
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
    rateLimitMap.set(key, record);
    return { locked: true, remainingAttempts: 0, lockoutSeconds: Math.ceil(LOCKOUT_MS / 1000) };
  }

  rateLimitMap.set(key, record);
  return { locked: false, remainingAttempts: MAX_ATTEMPTS - record.attempts };
}

export function clearLoginFailures(key: string): void {
  rateLimitMap.delete(key);
}
