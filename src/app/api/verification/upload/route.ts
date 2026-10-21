import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import crypto from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { getCitizenIdentity } from "@/lib/auth-helpers";
import { getAuthRetailer } from "@/lib/auth-helpers";
import { detectDocumentMimeType } from "@/lib/verification/validation";
import { ensureRetailerShopPhotos } from "@/lib/retailer-shop-photos";

const UPLOAD_DIR = path.join(process.cwd(), "data", "private", "kyc");
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export async function POST(request: NextRequest) {
  try {
    const citizen = await getCitizenIdentity(request);
    const retailer = citizen ? null : await getAuthRetailer(request);
    if (!citizen?.customerId && !retailer?.id) return NextResponse.json({ ok: false, error: "Sign in before uploading verification documents." }, { status: 401 });
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const docType = formData.get("docType") as string | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
    }

    const allowedDocTypes = retailer ? ["retailer-pan", "retailer-aadhaar", "retailer-business", "retailer-shop-photo"] : ["pan", "aadhaar", "voterId", "occupation", "es-passport-photo", "es-aadhaar-front", "es-aadhaar-back", "es-ration-card", "es-signature", "es-house-tax-receipt", "es-service-file"];
    if (!docType || !allowedDocTypes.includes(docType)) {
      return NextResponse.json({ ok: false, error: "Choose a valid verification document type." }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ ok: false, error: "File size must be under 5 MB" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const detectedMime = detectDocumentMimeType(bytes);
    if (!detectedMime || !ALLOWED_TYPES.includes(detectedMime) || (file.type && file.type !== detectedMime)) {
      return NextResponse.json({ ok: false, error: "The file content does not match a supported PDF, JPG, or PNG document." }, { status: 400 });
    }
    if (docType === "retailer-shop-photo" && !["image/jpeg", "image/png"].includes(detectedMime)) {
      return NextResponse.json({ ok: false, error: "Shop photos must be JPG or PNG images." }, { status: 400 });
    }
    if (retailer && docType === "retailer-shop-photo") {
      await ensureRetailerShopPhotos(Number(retailer.id));
      const [count] = await prisma.$queryRawUnsafe<any[]>("SELECT COUNT(*) AS total FROM retailer_shop_photos WHERE retailer_id = ?", retailer.id);
      if (Number(count?.total || 0) >= 10) return NextResponse.json({ ok: false, error: "A maximum of 10 shop photos can be uploaded." }, { status: 400 });
    }
    if (detectedMime === "application/pdf") {
      try {
        await PDFDocument.load(bytes);
      } catch {
        return NextResponse.json({ ok: false, error: "This PDF is damaged or unreadable. Upload a valid document." }, { status: 400 });
      }
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const ext = detectedMime === "application/pdf" ? "pdf" : detectedMime === "image/png" ? "png" : "jpg";
    const ownerId = citizen?.customerId || retailer?.id;
    const ownerType = citizen?.customerId ? "customer" : "retailer";
    const filename = `${ownerId}-${docType}-${crypto.randomUUID()}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");

    await writeFile(filePath, bytes, { flag: "wx", mode: 0o600 });
    let possibleDuplicate = false;
    try {
      const matches = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id FROM verification_document_artifacts
         WHERE sha256 = ? AND NOT (owner_type = ? AND owner_id = ?)
         LIMIT 1`,
        sha256,
        ownerType,
        String(ownerId)
      );
      possibleDuplicate = matches.length > 0;
      await prisma.$executeRawUnsafe(
        `INSERT INTO verification_document_artifacts
          (owner_type, owner_id, doc_type, storage_key, sha256, mime_type, byte_size, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3))`,
        ownerType,
        String(ownerId),
        docType,
        filename,
        sha256,
        detectedMime,
        bytes.byteLength
      );
    } catch (registryError) {
      await unlink(filePath).catch(() => undefined);
      throw registryError;
    }

    const publicUrl = `/api/verification/document?file=${encodeURIComponent(filename)}`;

    if (retailer && ["retailer-pan", "retailer-aadhaar", "retailer-business"].includes(docType)) {
      const column = docType === "retailer-pan" ? "pan_doc" : docType === "retailer-aadhaar" ? "aadhar_doc" : "ration_doc";
      try {
        await prisma.$executeRawUnsafe(`UPDATE retail_users SET ${column} = ?, updated_at = NOW() WHERE id = ?`, publicUrl, retailer.id);
      } catch (saveError) {
        await prisma.$executeRawUnsafe("DELETE FROM verification_document_artifacts WHERE owner_type = 'retailer' AND owner_id = ? AND storage_key = ?", String(retailer.id), filename).catch(() => 0);
        await unlink(filePath).catch(() => undefined);
        throw saveError;
      }
    }

    if (retailer && docType === "retailer-shop-photo") {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.$queryRawUnsafe("SELECT id FROM retail_users WHERE id = ? FOR UPDATE", retailer.id);
          const [count] = await tx.$queryRawUnsafe<any[]>("SELECT COUNT(*) AS total FROM retailer_shop_photos WHERE retailer_id = ?", retailer.id);
          if (Number(count?.total || 0) >= 10) throw new Error("A maximum of 10 shop photos can be uploaded.");
          await tx.$executeRawUnsafe("INSERT INTO retailer_shop_photos (retailer_id, photo_url) VALUES (?, ?)", retailer.id, publicUrl);
        });
      } catch (photoError) {
        await prisma.$executeRawUnsafe("DELETE FROM verification_document_artifacts WHERE owner_type = 'retailer' AND owner_id = ? AND storage_key = ?", String(retailer.id), filename).catch(() => 0);
        await unlink(filePath).catch(() => undefined);
        return NextResponse.json({ ok: false, error: photoError instanceof Error ? photoError.message : "Could not save shop photo." }, { status: 400 });
      }
    }

    // Persist each completed citizen upload into the server-side draft
    // immediately, so navigating away before the form debounce cannot lose it.
    if (citizen?.customerId && !docType.startsWith("es-")) {
      const [customer] = await prisma.$queryRawUnsafe<any[]>(
        `SELECT verification_status FROM customers WHERE id = ? LIMIT 1`,
        citizen.customerId
      );
      const submitted = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id FROM kyc_audit_logs WHERE user_type = 'customer' AND user_id = ? AND action_performed = 'submit_verification' LIMIT 1`,
        citizen.customerId
      );
      if (customer && (String(customer.verification_status || "").toLowerCase() !== "approved" || submitted.length === 0)) {
        const drafts = await prisma.$queryRawUnsafe<any[]>(
          `SELECT id, notes FROM kyc_audit_logs WHERE user_type = 'customer' AND user_id = ? AND action_performed = 'save_profile_draft' ORDER BY id DESC LIMIT 1`,
          citizen.customerId
        );
        const draftPrefix = "Verification profile draft: ";
        let profile: Record<string, any> = {};
        if (drafts.length) {
          try {
            const notes = String(drafts[0].notes || "");
            profile = JSON.parse(notes.startsWith(draftPrefix) ? notes.slice(draftPrefix.length) : "{}");
          } catch { profile = {}; }
        }
        profile[`${docType}File`] = publicUrl;
        profile._draftRevision = Math.max(Date.now() * 1000, Number(profile._draftRevision || 0) + 1);
        const notes = `${draftPrefix}${JSON.stringify(profile)}`;
        if (drafts.length) {
          await prisma.$executeRawUnsafe(
            `UPDATE kyc_audit_logs SET notes = ?, created_at = NOW() WHERE id = ?`,
            notes,
            drafts[0].id
          );
        } else {
          await prisma.$executeRawUnsafe(
            `INSERT INTO kyc_audit_logs (user_type, user_id, admin_id, action_performed, old_status, new_status, notes, ip_address, created_at)
             VALUES ('customer', ?, 0, 'save_profile_draft', ?, ?, ?, '127.0.0.1', NOW())`,
            citizen.customerId,
            customer.verification_status || "Not Submitted",
            customer.verification_status || "Pending",
            notes
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      filename,
      possibleDuplicate,
      message: possibleDuplicate
        ? "Document uploaded. It may need additional staff review."
        : docType.startsWith("es-") ? "Document uploaded securely." : "Document uploaded and saved to your verification profile.",
    });
  } catch (err) {
    console.error("POST /api/verification/upload error:", err);
    return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
  }
}
