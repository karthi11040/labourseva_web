import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Account lockout with progressive delays.
//
// Tracks failed login attempts in the LoginAttempt table and enforces
// escalating lockout periods on the User model:
//   - 5 failures  = 5-minute lock
//   - 10 failures = 30-minute lock
//   - 15 failures = 24-hour lock
// ---------------------------------------------------------------------------

/** Lockout thresholds: [failureCount, lockoutMinutes]. */
const LOCKOUT_TIERS: Array<[number, number]> = [
  [15, 1440], // 15 failures = 24 hours
  [10, 30],   // 10 failures = 30 minutes
  [5, 5],     // 5 failures  = 5 minutes
];

/** Portal type matching the schema enum. */
type Portal = "CUSTOMER" | "GUEST" | "RETAILER" | "DISTRIBUTOR" | "AGENT" | "EMPLOYEE" | "ADMIN";

export interface LockoutInfo {
  /** Whether the account is currently locked. */
  locked: boolean;
  /** Number of failed attempts recorded. */
  failedAttempts: number;
  /** When the lockout expires, if locked. */
  lockedUntil: Date | null;
  /** Minutes remaining in the lockout, if locked. */
  remainingMinutes: number;
  /** The tier that triggered the current lockout, if any. */
  tier: number | null;
}

/**
 * Calculate the lockout duration based on the number of failed attempts.
 *
 * @param failureCount - Total number of consecutive failed attempts
 * @returns Lockout duration in minutes, or 0 if no lockout applies
 */
function getLockoutMinutes(failureCount: number): number {
  for (const [threshold, minutes] of LOCKOUT_TIERS) {
    if (failureCount >= threshold) {
      return minutes;
    }
  }
  return 0;
}

/**
 * Record a failed login attempt. Increments the user's failure counter
 * and applies progressive lockout if a threshold is reached.
 *
 * @param identifierHash - HMAC blind index of the phone/email used for login
 * @param portal - The portal where the login was attempted
 * @param ip - The IP address of the attempt
 * @param reason - Optional reason code (e.g. "BAD_PASSWORD", "ACCOUNT_NOT_FOUND")
 */
export async function recordFailedAttempt(
  identifierHash: string,
  portal: Portal,
  ip: string | null,
  reason?: string,
): Promise<void> {
  // Record the attempt in the LoginAttempt table.
  await prisma.loginAttempt.create({
    data: {
      portal,
      identifierHash,
      success: false,
      reason: reason ?? "BAD_CREDENTIALS",
      ip,
    },
  });

  // Find the user by their identifier hash.
  const user = await prisma.user.findFirst({
    where: { phoneHash: identifierHash },
    select: { id: true, failedLoginCount: true },
  });

  if (!user) {
    // User not found; nothing to lock. The attempt is still logged above.
    return;
  }

  const newCount = user.failedLoginCount + 1;
  const lockoutMinutes = getLockoutMinutes(newCount);

  const updateData: {
    failedLoginCount: number;
    lockedUntil?: Date | null;
  } = {
    failedLoginCount: newCount,
  };

  if (lockoutMinutes > 0) {
    updateData.lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  });
}

/**
 * Record a successful login. Resets the failure counter and clears any lockout.
 *
 * @param identifierHash - HMAC blind index of the phone/email used for login
 * @param portal - The portal where the login succeeded
 * @param ip - The IP address of the successful login
 */
export async function recordSuccessfulLogin(
  identifierHash: string,
  portal: Portal,
  ip: string | null,
): Promise<void> {
  // Record the successful attempt.
  await prisma.loginAttempt.create({
    data: {
      portal,
      identifierHash,
      success: true,
      ip,
    },
  });

  // Find and reset the user's failure counter.
  const user = await prisma.user.findFirst({
    where: { phoneHash: identifierHash },
    select: { id: true },
  });

  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ip,
    },
  });
}

/**
 * Check whether an account is currently locked out.
 *
 * @param identifierHash - HMAC blind index of the phone/email
 * @returns LockoutInfo with current lockout status
 */
export async function isAccountLocked(identifierHash: string): Promise<LockoutInfo> {
  return getLockoutInfo(identifierHash);
}

/**
 * Get detailed lockout information for an account.
 *
 * @param identifierHash - HMAC blind index of the phone/email
 * @returns LockoutInfo with full lockout details
 */
export async function getLockoutInfo(identifierHash: string): Promise<LockoutInfo> {
  const user = await prisma.user.findFirst({
    where: { phoneHash: identifierHash },
    select: {
      failedLoginCount: true,
      lockedUntil: true,
    },
  });

  if (!user) {
    return {
      locked: false,
      failedAttempts: 0,
      lockedUntil: null,
      remainingMinutes: 0,
      tier: null,
    };
  }

  const now = new Date();

  // Check if the lockout has expired.
  if (user.lockedUntil && user.lockedUntil > now) {
    const remainingMs = user.lockedUntil.getTime() - now.getTime();
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));

    // Determine which tier caused this lockout.
    let tier: number | null = null;
    for (const [threshold] of LOCKOUT_TIERS) {
      if (user.failedLoginCount >= threshold) {
        tier = threshold;
        break;
      }
    }

    return {
      locked: true,
      failedAttempts: user.failedLoginCount,
      lockedUntil: user.lockedUntil,
      remainingMinutes,
      tier,
    };
  }

  // Not locked (or lockout has expired).
  return {
    locked: false,
    failedAttempts: user.failedLoginCount,
    lockedUntil: null,
    remainingMinutes: 0,
    tier: null,
  };
}

/**
 * Forcefully unlock an account. Intended for admin use.
 *
 * @param userId - The user ID to unlock
 * @param adminId - The admin performing the unlock (for audit logging)
 */
export async function forceUnlockAccount(
  userId: string,
  adminId: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  // Log the unlock action via the audit log.
  // Import dynamically to avoid circular dependency.
  const { logAuditEvent } = await import("./audit-log");
  await logAuditEvent(
    "ACCOUNT_UNLOCKED",
    adminId,
    userId,
    null,
    null,
    { actorRole: "ADMIN", entityType: "User", reason: "Admin forced unlock" },
  );
}

/**
 * Get recent login attempts for an identifier.
 *
 * @param identifierHash - HMAC blind index of the phone/email
 * @param limit - Maximum number of attempts to return
 * @returns Array of recent login attempts, newest first
 */
export async function getRecentAttempts(
  identifierHash: string,
  limit = 20,
) {
  return prisma.loginAttempt.findMany({
    where: { identifierHash },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      portal: true,
      success: true,
      reason: true,
      ip: true,
      createdAt: true,
    },
  });
}

/**
 * Generate a random identifier hash for testing purposes.
 * In production, use the generateBlindIndex function from encryption.ts.
 */
export function _testGenerateHash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
