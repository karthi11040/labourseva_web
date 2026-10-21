import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Sliding window rate limiter backed by the RateLimitBucket table.
//
// Each bucket has a key (e.g. "login:ip:1.2.3.4" or "otp:phone:<hash>"),
// a count, a window start time, and an expiry. When the window elapses the
// bucket resets. Expired buckets are cleaned up opportunistically.
// ---------------------------------------------------------------------------

/** Pre-defined endpoint categories with default limits. */
export const RATE_LIMIT_PRESETS = {
  /** Login attempts per IP address. */
  LOGIN_IP: { limit: 10, windowSeconds: 900 }, // 10 per 15 min
  /** Login attempts per identifier (phone/email hash). */
  LOGIN_IDENTIFIER: { limit: 5, windowSeconds: 900 }, // 5 per 15 min
  /** OTP generation requests per phone number. */
  OTP_PHONE: { limit: 3, windowSeconds: 3600 }, // 3 per hour
  /** General API calls per IP. */
  API_IP: { limit: 120, windowSeconds: 60 }, // 120 per minute
  /** Password reset requests per identifier. */
  PASSWORD_RESET: { limit: 3, windowSeconds: 3600 }, // 3 per hour
  /** Registration attempts per IP. */
  REGISTER_IP: { limit: 5, windowSeconds: 3600 }, // 5 per hour
} as const;

export type RateLimitPreset = keyof typeof RATE_LIMIT_PRESETS;

export interface RateLimitResult {
  /** Whether the request is allowed. */
  allowed: boolean;
  /** Current count within the window. */
  count: number;
  /** Maximum allowed count. */
  limit: number;
  /** Remaining requests before the limit is reached. */
  remaining: number;
  /** Seconds until the current window resets. */
  resetSeconds: number;
}

/**
 * Check whether a rate limit key has exceeded its allowed count.
 * Does NOT increment the counter; use {@link incrementRateLimit} for that.
 *
 * @param key - Unique identifier for the rate limit bucket (e.g. "login:ip:1.2.3.4")
 * @param limit - Maximum number of requests allowed in the window
 * @param windowSeconds - Length of the sliding window in seconds
 * @returns RateLimitResult with current state
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = new Date();

  const bucket = await prisma.rateLimitBucket.findUnique({
    where: { key },
  });

  // No bucket exists yet — first request.
  if (!bucket) {
    return {
      allowed: true,
      count: 0,
      limit,
      remaining: limit,
      resetSeconds: windowSeconds,
    };
  }

  // Bucket exists but the window has expired — treat as fresh.
  if (bucket.expiresAt <= now) {
    // Opportunistic cleanup of the expired bucket.
    await prisma.rateLimitBucket.delete({ where: { key } }).catch(() => {});
    return {
      allowed: true,
      count: 0,
      limit,
      remaining: limit,
      resetSeconds: windowSeconds,
    };
  }

  const resetMs = bucket.expiresAt.getTime() - now.getTime();
  const resetSeconds = Math.ceil(resetMs / 1000);
  const remaining = Math.max(0, limit - bucket.count);

  return {
    allowed: bucket.count < limit,
    count: bucket.count,
    limit,
    remaining,
    resetSeconds,
  };
}

/**
 * Increment the counter for a rate limit bucket. Creates the bucket if it
 * does not exist, or resets it if the window has expired.
 *
 * @param key - Unique identifier for the rate limit bucket
 * @param windowSeconds - Length of the sliding window in seconds
 * @returns The new count after incrementing
 */
export async function incrementRateLimit(
  key: string,
  windowSeconds: number,
): Promise<number> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);

  // Try to update an existing, non-expired bucket first.
  const result = await prisma.rateLimitBucket.updateMany({
    where: {
      key,
      expiresAt: { gt: now },
    },
    data: {
      count: { increment: 1 },
    },
  });

  if (result.count > 0) {
    // Read the updated count.
    const bucket = await prisma.rateLimitBucket.findUnique({ where: { key } });
    return bucket?.count ?? 1;
  }

  // Either no bucket exists or it has expired. Upsert to reset.
  await prisma.rateLimitBucket.upsert({
    where: { key },
    update: {
      count: 1,
      windowStart: now,
      expiresAt,
    },
    create: {
      key,
      count: 1,
      windowStart: now,
      expiresAt,
    },
  });

  return 1;
}

/**
 * Reset (delete) a rate limit bucket. Use after a successful login to clear
 * the failure counter, for example.
 *
 * @param key - The bucket key to remove
 */
export async function resetRateLimit(key: string): Promise<void> {
  await prisma.rateLimitBucket.delete({ where: { key } }).catch(() => {
    // Ignore if the bucket doesn't exist.
  });
}

/**
 * Check and increment in a single call. Returns the rate limit state
 * AFTER incrementing. If the limit has already been reached, the counter
 * is NOT incremented.
 *
 * @param key - Unique identifier for the rate limit bucket
 * @param limit - Maximum number of requests allowed in the window
 * @param windowSeconds - Length of the sliding window in seconds
 * @returns RateLimitResult reflecting the state after this call
 */
export async function checkAndIncrement(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const current = await checkRateLimit(key, limit, windowSeconds);

  if (!current.allowed) {
    return current;
  }

  const newCount = await incrementRateLimit(key, windowSeconds);

  return {
    allowed: true,
    count: newCount,
    limit,
    remaining: Math.max(0, limit - newCount),
    resetSeconds: current.resetSeconds,
  };
}

/**
 * Convenience function using a preset configuration.
 *
 * @param preset - One of the predefined rate limit categories
 * @param identifier - The specific identifier (IP, phone hash, etc.)
 * @returns RateLimitResult after checking and incrementing
 */
export async function checkPreset(
  preset: RateLimitPreset,
  identifier: string,
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_PRESETS[preset];
  const key = `${preset}:${identifier}`;
  return checkAndIncrement(key, config.limit, config.windowSeconds);
}

/**
 * Remove all expired rate limit buckets from the database.
 * Intended to be called from a periodic cleanup job.
 *
 * @returns Number of buckets deleted
 */
export async function cleanupExpiredBuckets(): Promise<number> {
  const now = new Date();
  const result = await prisma.rateLimitBucket.deleteMany({
    where: {
      expiresAt: { lte: now },
    },
  });
  return result.count;
}
