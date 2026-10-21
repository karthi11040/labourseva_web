import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Hash-chained audit logging.
//
// Each AuditLog row stores a SHA-256 hash of its own content plus the hash
// of the preceding row. This creates a tamper-evident chain: if any row is
// modified or deleted, subsequent hashes will not match.
//
// The table is INSERT-only for the application. Never UPDATE or DELETE.
// ---------------------------------------------------------------------------

/** Fields that go into the hash computation for an audit log entry. */
interface HashInput {
  actorId: string | null;
  actorRole: string | null;
  portal: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  reason: string | null;
  meta: string | null; // JSON stringified metadata
  ip: string | null;
  userAgent: string | null;
  prevHash: string | null;
  createdAt: Date;
}

/**
 * Compute the SHA-256 hash for an audit log entry.
 * The hash covers all mutable fields plus the previous hash in the chain.
 */
function computeHash(input: HashInput): string {
  const payload = [
    input.actorId ?? "",
    input.actorRole ?? "",
    input.portal ?? "",
    input.action,
    input.entityType ?? "",
    input.entityId ?? "",
    input.reason ?? "",
    input.meta ?? "",
    input.ip ?? "",
    input.userAgent ?? "",
    input.prevHash ?? "",
    input.createdAt.toISOString(),
  ].join("|");

  return crypto.createHash("sha256").update(payload).digest("hex");
}

/**
 * Get the hash of the most recent audit log entry (the current chain tip).
 * Returns null if the audit log is empty.
 */
async function getLatestHash(): Promise<string | null> {
  const latest = await prisma.auditLog.findFirst({
    orderBy: { id: "desc" },
    select: { hash: true },
  });
  return latest?.hash ?? null;
}

/**
 * Record an audit event. The entry is hash-chained to the previous entry
 * for tamper detection.
 *
 * @param action - The action performed (e.g. "USER_LOGIN", "APPLICATION_APPROVED")
 * @param actorId - The user ID of the actor, or null for system actions
 * @param targetId - The entity ID being acted upon (optional)
 * @param metadata - Additional structured data about the event (optional)
 * @param ipAddress - The IP address of the actor (optional)
 * @param options - Additional optional fields
 * @returns The ID of the newly created audit log entry
 */
export async function logAuditEvent(
  action: string,
  actorId: string | null = null,
  targetId: string | null = null,
  metadata: Record<string, unknown> | null = null,
  ipAddress: string | null = null,
  options: {
    actorRole?: string;
    portal?: string;
    entityType?: string;
    reason?: string;
    userAgent?: string;
  } = {},
): Promise<bigint> {
  const prevHash = await getLatestHash();
  const now = new Date();

  const metaStr = metadata ? JSON.stringify(metadata) : null;

  const hashInput: HashInput = {
    actorId,
    actorRole: options.actorRole ?? null,
    portal: options.portal ?? null,
    action,
    entityType: options.entityType ?? null,
    entityId: targetId,
    reason: options.reason ?? null,
    meta: metaStr,
    ip: ipAddress,
    userAgent: options.userAgent ?? null,
    prevHash,
    createdAt: now,
  };

  const hash = computeHash(hashInput);

  const entry = await prisma.auditLog.create({
    data: {
      actorId,
      actorRole: options.actorRole ?? null,
      portal: (options.portal as "CUSTOMER" | "GUEST" | "RETAILER" | "DISTRIBUTOR" | "AGENT" | "EMPLOYEE" | "ADMIN") ?? null,
      action,
      entityType: options.entityType ?? null,
      entityId: targetId,
      reason: options.reason ?? null,
      meta: metadata !== null ? (metadata as Prisma.InputJsonValue) : undefined,
      ip: ipAddress,
      userAgent: options.userAgent ?? null,
      prevHash,
      hash,
      createdAt: now,
    },
  });

  return entry.id;
}

/** Result of verifying a segment of the audit chain. */
export interface AuditChainVerification {
  /** Whether all hashes in the range are valid. */
  valid: boolean;
  /** Total number of entries checked. */
  entriesChecked: number;
  /** The first invalid entry ID, if any. */
  firstInvalidId: bigint | null;
  /** Human-readable description of the result. */
  message: string;
}

/**
 * Verify the integrity of the audit log hash chain between two entry IDs.
 *
 * @param startId - The first entry ID to verify (inclusive)
 * @param endId - The last entry ID to verify (inclusive)
 * @returns AuditChainVerification with details about the result
 */
export async function verifyAuditChain(
  startId: bigint,
  endId: bigint,
): Promise<AuditChainVerification> {
  if (startId > endId) {
    return {
      valid: false,
      entriesChecked: 0,
      firstInvalidId: null,
      message: "startId must be less than or equal to endId",
    };
  }

  const entries = await prisma.auditLog.findMany({
    where: {
      id: { gte: startId, lte: endId },
    },
    orderBy: { id: "asc" },
  });

  if (entries.length === 0) {
    return {
      valid: false,
      entriesChecked: 0,
      firstInvalidId: null,
      message: "No entries found in the specified range",
    };
  }

  let expectedPrevHash: string | null = null;

  // For the first entry, we need the hash of the entry before it.
  if (entries[0].prevHash !== null) {
    // Check if there's an entry before startId that we can reference.
    const prevEntry = await prisma.auditLog.findFirst({
      where: { id: { lt: startId } },
      orderBy: { id: "desc" },
      select: { hash: true },
    });

    if (prevEntry) {
      expectedPrevHash = prevEntry.hash;
    } else {
      // startId is the first entry in the table; prevHash should be null.
      expectedPrevHash = null;
    }
  }

  for (const entry of entries) {
    // Check that prevHash matches the expected value.
    if (expectedPrevHash !== null && entry.prevHash !== expectedPrevHash) {
      return {
        valid: false,
        entriesChecked: entries.indexOf(entry) + 1,
        firstInvalidId: entry.id,
        message: `Chain broken at entry ${entry.id}: prevHash mismatch`,
      };
    }

    // Recompute the hash and compare.
    const metaStr = entry.meta ? JSON.stringify(entry.meta) : null;

    const hashInput: HashInput = {
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      portal: entry.portal,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      reason: entry.reason,
      meta: metaStr,
      ip: entry.ip,
      userAgent: entry.userAgent,
      prevHash: entry.prevHash,
      createdAt: entry.createdAt,
    };

    const computedHash = computeHash(hashInput);

    if (computedHash !== entry.hash) {
      return {
        valid: false,
        entriesChecked: entries.indexOf(entry) + 1,
        firstInvalidId: entry.id,
        message: `Hash mismatch at entry ${entry.id}: content may have been tampered with`,
      };
    }

    expectedPrevHash = entry.hash;
  }

  return {
    valid: true,
    entriesChecked: entries.length,
    firstInvalidId: null,
    message: `All ${entries.length} entries verified successfully`,
  };
}

/**
 * Retrieve audit log entries for a specific entity.
 *
 * @param entityType - The type of entity (e.g. "User", "Application")
 * @param entityId - The ID of the entity
 * @param limit - Maximum number of entries to return
 * @returns Array of audit log entries, newest first
 */
export async function getAuditEntriesForEntity(
  entityType: string,
  entityId: string,
  limit = 50,
) {
  return prisma.auditLog.findMany({
    where: { entityType, entityId },
    orderBy: { id: "desc" },
    take: limit,
  });
}

/**
 * Retrieve audit log entries for a specific actor.
 *
 * @param actorId - The user ID of the actor
 * @param limit - Maximum number of entries to return
 * @returns Array of audit log entries, newest first
 */
export async function getAuditEntriesForActor(
  actorId: string,
  limit = 50,
) {
  return prisma.auditLog.findMany({
    where: { actorId },
    orderBy: { id: "desc" },
    take: limit,
  });
}
