import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getCitizenIdentity } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const citizen = await getCitizenIdentity(request);
    if (!citizen) {
      return NextResponse.json({ ok: false, error: "Authentication required to upload documents." }, { status: 401 });
    }

    const customerId = citizen.customerId || 0;
    const formData = await request.formData();
    const file = formData.get("file");
    const rawAppId = formData.get("applicationId");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Please upload a valid document file." }, { status: 400 });
    }

    // Limit file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "Document file exceeds the maximum 10MB limit." }, { status: 400 });
    }

    if (!rawAppId) {
      return NextResponse.json({ ok: false, error: "Application identifier is required." }, { status: 400 });
    }

    const idNumber = Number(String(rawAppId).replace(/\D/g, ""));
    if (!idNumber || isNaN(idNumber)) {
      return NextResponse.json({ ok: false, error: "Invalid application record ID." }, { status: 400 });
    }

    // 1. Fetch Application Record and verify caller ownership
    const srRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT sr.id, sr.status FROM service_requests sr WHERE sr.id = ? AND (sr.customer_id = ? OR sr.user_id = ?) LIMIT 1`,
      idNumber,
      customerId,
      customerId
    ).catch(() => []);

    if (!srRows || srRows.length === 0) {
      return NextResponse.json({ ok: false, error: "Application record not found or access denied." }, { status: 404 });
    }

    // 2. Validate PDF signature (magic bytes: %PDF)
    const rawBytes = new Uint8Array(await file.arrayBuffer());
    if (
      rawBytes.length < 4 ||
      rawBytes[0] !== 0x25 ||
      rawBytes[1] !== 0x50 ||
      rawBytes[2] !== 0x44 ||
      rawBytes[3] !== 0x46
    ) {
      return NextResponse.json({ ok: false, error: "Invalid file format. Uploaded document must be an authentic PDF file." }, { status: 400 });
    }

    // 3. Ensure target upload directory exists
    const uploadsDir = path.join(process.cwd(), "public", "assets", "uploads", "services", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    // 4. Save uploaded original document with sanitized random filename
    const uploadBaseName = `upload_cust_${idNumber}_${Date.now()}.pdf`;
    const uploadDiskPath = path.join(uploadsDir, uploadBaseName);
    await fs.writeFile(uploadDiskPath, Buffer.from(rawBytes));
    const uploadedWebPath = `/assets/uploads/services/uploads/${uploadBaseName}`;

    // 5. Update database record in service_requests (mark status as in_review)
    await prisma.$executeRawUnsafe(
      `UPDATE service_requests
       SET 
         uploaded_doc_path = ?,
         upload_date = NOW(),
         status = 'in_review'
       WHERE id = ?`,
      uploadedWebPath,
    );

    // 5. Trigger In-App Notification
    try {
      const { createInAppNotification } = await import("@/lib/notifications");
      await createInAppNotification({
        userId: "1",
        templateKey: "DOCUMENT_UPLOADED",
        title: "Document Uploaded — Under Review",
        body: `Application DOC-${idNumber} document was uploaded and submitted for district review.`,
        link: "/user/applications",
        metadata: { applicationId: `DOC-${idNumber}`, idNumber: String(idNumber), uploadedWebPath },
      });
    } catch (notifErr) {
      console.warn("Notification dispatch failed on upload:", notifErr);
    }

    return NextResponse.json({
      ok: true,
      message: "Completed document uploaded successfully. Awaiting administrative review.",
      uploadedDocPath: uploadedWebPath,
      status: "in_review",
    });
  } catch (err: any) {
    console.error("POST /api/user/applications/upload error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to upload document" },
      { status: 500 }
    );
  }
}
