import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

const PRIVATE_UPLOAD_DIR = path.join(process.cwd(), "data", "private", "kyc");
const VALID_STORAGE_KEY = /^[0-9]+-(?:pan|aadhaar|voterId|occupation|retailer-pan|retailer-aadhaar|retailer-business|retailer-shop-photo)-[0-9a-f-]+\.(?:pdf|jpg|png)$/i;

/** Fingerprint registered hashes, or hash the submitted private files when the registry migration is not installed yet. */
export async function getCustomerDocumentDigest(userId: number, ownerType: "customer" | "retailer" = "customer"): Promise<{ digest: string; documentCount: number }> {
  let artifacts: { doc_type: string; storage_key: string; sha256: string }[] = [];
  try {
    artifacts = await prisma.$queryRawUnsafe(
      `SELECT doc_type, storage_key, sha256 FROM verification_document_artifacts
       WHERE owner_type = ? AND owner_id = ? ORDER BY doc_type, storage_key`,
      ownerType,
      String(userId)
    ) as typeof artifacts;
  } catch {
    // Fall back to the submitted profile's local protected file references when the table is not migrated.
  }

  if (artifacts.length) {
    const fingerprint = artifacts.map((row) => [row.doc_type, row.storage_key, row.sha256]);
    return {
      digest: createHash("sha256").update(JSON.stringify(fingerprint)).digest("hex"),
      documentCount: artifacts.length,
    };
  }

  const submissions = await prisma.$queryRawUnsafe<any[]>(
    `SELECT action_performed, notes FROM kyc_audit_logs
     WHERE user_type = 'customer' AND user_id = ? AND action_performed IN ('submit_verification','save_profile_draft')
     ORDER BY id DESC`,
    userId
  ).catch(() => []);
  const profile: Record<string, unknown> = {};
  for (const row of submissions) {
    const prefix = row.action_performed === "save_profile_draft" ? "Verification profile draft: " : "Verification profile: ";
    const notes = String(row.notes || "");
    if (!notes.startsWith(prefix)) continue;
    try {
      const parsed = JSON.parse(notes.slice(prefix.length));
      for (const [key, value] of Object.entries(parsed)) if (!(key in profile)) profile[key] = value;
    } catch { /* Skip malformed legacy snapshots. */ }
  }

  if (ownerType === "retailer") {
    const [retailer] = await prisma.$queryRawUnsafe<any[]>(`SELECT pan_doc, aadhar_doc, ration_doc, shop_image FROM retail_users WHERE id = ? LIMIT 1`, userId).catch(() => []);
    if (retailer) {
      profile.panFile = retailer.pan_doc;
      profile.aadhaarFile = retailer.aadhar_doc;
      profile.businessFile = retailer.ration_doc;
      profile.shopPhoto = retailer.shop_image;
    }
    profile.shopPhotos = await prisma.$queryRawUnsafe<any[]>(
      "SELECT photo_url FROM retailer_shop_photos WHERE retailer_id = ? ORDER BY id",
      userId
    ).then((rows) => rows.map((row) => row.photo_url)).catch(() => []);
  }

  const refs: [string, string][] = [];
  const requiredOwnerPrefix = `${userId}-`;
  for (const [docType, value, filenameDocType] of [
    ["aadhaar", profile.aadhaarFile, ownerType === "retailer" ? "retailer-aadhaar" : "aadhaar"],
    ["pan", profile.panFile, ownerType === "retailer" ? "retailer-pan" : "pan"],
    ["voterId", profile.voterIdFile, "voterId"],
    ["occupation", profile.occupationFile, "occupation"],
    ["business", profile.businessFile, "retailer-business"],
    ["shopPhoto", profile.shopPhoto, "retailer-shop-photo"],
  ] as const) {
    if (typeof value !== "string" || !value) continue;
    let filename = "";
    try {
      const url = new URL(value, "http://localhost");
      if (url.pathname === "/api/verification/document") filename = url.searchParams.get("file") || "";
      else filename = path.basename(url.pathname);
    } catch { filename = path.basename(value); }
    if (!VALID_STORAGE_KEY.test(filename) || !filename.startsWith(`${requiredOwnerPrefix}${filenameDocType}-`)) continue;
    try {
      const bytes = await readFile(path.join(PRIVATE_UPLOAD_DIR, filename));
      refs.push([docType, createHash("sha256").update(bytes).digest("hex")]);
    } catch { /* Missing local files are omitted; no private path is returned. */ }
  }
  if (Array.isArray(profile.shopPhotos)) {
    for (const value of profile.shopPhotos) {
      if (typeof value !== "string" || !value) continue;
      let filename = "";
      try {
        const url = new URL(value, "http://localhost");
        filename = url.pathname === "/api/verification/document" ? url.searchParams.get("file") || "" : path.basename(url.pathname);
      } catch { filename = path.basename(value); }
      if (!VALID_STORAGE_KEY.test(filename) || !filename.startsWith(`${userId}-retailer-shop-photo-`)) continue;
      try {
        const bytes = await readFile(path.join(PRIVATE_UPLOAD_DIR, filename));
        refs.push(["shopPhoto", createHash("sha256").update(bytes).digest("hex")]);
      } catch { /* Missing local files are omitted; no private path is returned. */ }
    }
  }

  refs.sort(([a], [b]) => a.localeCompare(b));
  return {
    digest: createHash("sha256").update(JSON.stringify(refs)).digest("hex"),
    documentCount: refs.length,
  };
}
