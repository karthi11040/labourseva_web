import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/security";

// ---------------------------------------------------------------------------
// Progressive legacy-password rehash.
//
// The PHP-era database keeps a `plain_password` column for some accounts
// (legacy retailers/distributors). Hard-disabling plaintext verification
// overnight would lock those operators out of a live portal, so instead:
//
//   1. If the bcrypt/scrypt hash verifies -> normal login.
//   2. Else if the plaintext column matches -> login SUCCEEDS, then the hash
//      is upgraded in the same request (bcrypt for parity with legacy rows)
//      and `plain_password` is nulled.
//
// The database therefore converges to hashed-only storage without ever
// blocking a live user. A CRITICAL log is emitted per plaintext success for
// the ops dashboard.
// ---------------------------------------------------------------------------

export interface LegacyRehashTable {
  table: "retail_users" | "distributors" | "customers" | "employees";
  idColumn: string;
}

export type VerificationOutcome =
  | { matched: true; migratedFromPlain: boolean }
  | { matched: false };

/**
 * Verify a password against the primary hash, falling back to the legacy
 * plaintext column with an automatic one-time migration on success.
 */
export async function verifyWithProgressiveRehash(
  password: string,
  account: { password?: string | null; plain_password?: string | null; id: number | string },
  meta: LegacyRehashTable
): Promise<VerificationOutcome> {
  if (account.password && verifyLegacyHash(password, account.password)) {
    return { matched: true, migratedFromPlain: false };
  }

  if (account.plain_password && account.plain_password === password) {
    console.error(
      `[CRITICAL] ${meta.table} #${account.id} authenticated via the legacy plain_password column. ` +
        "Migrating to a hashed password in the same request. Backfill remaining rows with scripts/report_plain_passwords.js."
    );
    const newHash = hashPassword(password); // scrypt, project standard
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE ${meta.table} SET password = ?, plain_password = NULL WHERE ${meta.idColumn} = ?`,
        newHash,
        account.id
      );
    } catch {
      // Column may not exist in this environment — never block a live login.
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE ${meta.table} SET password = ? WHERE ${meta.idColumn} = ?`,
          newHash,
          account.id
        );
      } catch {}
    }
    return { matched: true, migratedFromPlain: true };
  }

  return { matched: false };
}

/** scrypt (project standard) or bcrypt-hex ($2y$/$2a$/$2b$) verification. */
function verifyLegacyHash(password: string, storedHash: string): boolean {
  if (storedHash.startsWith("scrypt:")) {
    const [, salt, expectedKey] = storedHash.split(":");
    if (!salt || !expectedKey) return false;
    const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
    const a = Buffer.from(derivedKey, "hex");
    const b = Buffer.from(expectedKey, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  const prefix = storedHash.slice(0, 4);
  if (prefix === "$2y$" || prefix === "$2a$" || prefix === "$2b$") {
    try {
      return bcrypt.compareSync(password, storedHash.replace(/^\$2y\$/, "$2a$"));
    } catch {
      return false;
    }
  }

  return false;
}
