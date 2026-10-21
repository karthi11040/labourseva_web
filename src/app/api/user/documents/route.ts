import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCitizenIdentity } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const citizen = await getCitizenIdentity(request);
    if (!citizen) {
      return NextResponse.json(
        { ok: false, error: "Authentication required to view documents.", documents: [] },
        { status: 401 }
      );
    }

    const customerId = citizen.customerId || 0;

    // 1. Fetch available statutory forms and downloads from database (public statutory templates)
    const dbDownloads = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id, title, category, file_path, file_type, file_size, description, download_count, status, created_at 
      FROM downloads 
      ORDER BY id DESC
    `).catch(() => []);

    // 2. Fetch completed certificates & uploaded documents belonging ONLY to authenticated citizen
    const serviceDocs = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
        sr.id,
        sr.signed_pdf_path,
        sr.uploaded_doc_path,
        sr.signed_at,
        sr.created_at,
        s.name AS service_name
      FROM service_requests sr
      LEFT JOIN services s ON sr.service_id = s.id
      WHERE (sr.customer_id = ? OR sr.user_id = ?) AND (sr.signed_pdf_path IS NOT NULL OR sr.uploaded_doc_path IS NOT NULL)
      ORDER BY sr.id DESC`,
      customerId,
      customerId
    ).catch(() => []);

    // 3. Fetch customer KYC documents for authenticated citizen ONLY
    const customerKyc = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, full_name, aadhaar_file, pancard_file, rationcard_file, customer_photo, signature_file, verification_status, created_at
      FROM customers
      WHERE id = ? LIMIT 1`,
      customerId
    ).catch(() => []);

    const documents: any[] = [];


    // Map KYC docs
    if (customerKyc.length > 0) {
      const c = customerKyc[0];
      if (c.aadhaar_file) {
        documents.push({
          id: `kyc-aadhaar-${c.id}`,
          name: "Aadhaar Card Copy",
          nameTa: "ஆதார் அட்டை நகல்",
          category: "Identity & KYC",
          filename: c.aadhaar_file.split("/").pop() || "aadhaar_card.pdf",
          filePath: c.aadhaar_file,
          uploadDate: c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN") : "Verified",
          fileSize: "1.2 MB",
          status: c.verification_status === "Approved" ? "verified" : "pending",
          statusLabel: c.verification_status === "Approved" ? "Verified" : "Under Scrutiny",
        });
      }
      if (c.pancard_file) {
        documents.push({
          id: `kyc-pan-${c.id}`,
          name: "PAN Card Document",
          nameTa: "பான் கார்டு ஆவணம்",
          category: "Tax & Financial",
          filename: c.pancard_file.split("/").pop() || "pancard_copy.pdf",
          filePath: c.pancard_file,
          uploadDate: c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN") : "Verified",
          fileSize: "850 KB",
          status: c.verification_status === "Approved" ? "verified" : "pending",
          statusLabel: c.verification_status === "Approved" ? "Verified" : "Under Scrutiny",
        });
      }
      if (c.rationcard_file) {
        documents.push({
          id: `kyc-ration-${c.id}`,
          name: "Smart Family Ration Card",
          nameTa: "குடும்ப அட்டை நகல்",
          category: "Residential Proof",
          filename: c.rationcard_file.split("/").pop() || "ration_card.pdf",
          filePath: c.rationcard_file,
          uploadDate: c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN") : "Verified",
          fileSize: "1.8 MB",
          status: c.verification_status === "Approved" ? "verified" : "pending",
          statusLabel: c.verification_status === "Approved" ? "Verified" : "Under Scrutiny",
        });
      }
    }

    // Map Service Certificates
    for (const s of serviceDocs) {
      if (s.signed_pdf_path) {
        documents.push({
          id: `cert-${s.id}`,
          name: `Digitally Signed Certificate - ${s.service_name || "Statutory Benefit"}`,
          nameTa: "மின்னணு கையொப்பமிட்ட சான்றிதழ்",
          category: "Issued Certificates",
          filename: s.signed_pdf_path.split("/").pop() || `Certificate_${s.id}.pdf`,
          filePath: s.signed_pdf_path,
          uploadDate: s.signed_at ? new Date(s.signed_at).toLocaleDateString("en-IN") : "Recent",
          fileSize: "620 KB",
          status: "verified",
          statusLabel: "Signed & Issued",
        });
      } else if (s.uploaded_doc_path) {
        documents.push({
          id: `app-doc-${s.id}`,
          name: `Application Dossier - ${s.service_name || "Service Application"}`,
          nameTa: "விண்ணப்ப ஆவணம்",
          category: "Application Filings",
          filename: s.uploaded_doc_path.split("/").pop() || `Dossier_${s.id}.pdf`,
          filePath: s.uploaded_doc_path,
          uploadDate: s.created_at ? new Date(s.created_at).toLocaleDateString("en-IN") : "Recent",
          fileSize: "1.5 MB",
          status: "pending",
          statusLabel: "Pending Screening",
        });
      }
    }

    // Map Official Statutory Downloads
    for (const d of dbDownloads) {
      documents.push({
        id: `dl-${d.id}`,
        name: d.title,
        nameTa: "அரசு அறிவிப்பு / படிவம்",
        category: d.category || "Official Forms & Guidelines",
        filename: d.file_path ? d.file_path.split("/").pop() : `${d.title}.pdf`,
        filePath: d.file_path || "#",
        uploadDate: d.created_at ? new Date(d.created_at).toLocaleDateString("en-IN") : "Current",
        fileSize: d.file_size || "1.0 MB",
        status: "verified",
        statusLabel: "Official Document",
      });
    }

    return NextResponse.json({ ok: true, documents });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
