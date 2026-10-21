import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCitizenIdentity } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

function normalizeAssetPath(p: string | null | undefined): string | null {
  if (!p) return null;
  let clean = p.trim();
  if (clean.startsWith("../assets/")) {
    clean = clean.replace(/^\.\.\/assets\//, "/assets/");
  } else if (clean.startsWith("assets/")) {
    clean = "/" + clean;
  }
  return clean;
}

export async function GET(request: NextRequest) {
  try {
    const citizen = await getCitizenIdentity(request);
    if (!citizen) {
      return NextResponse.json(
        { ok: false, error: "Authentication required to view applications.", applications: [] },
        { status: 401 }
      );
    }

    const customerId = citizen.customerId || 0;

    // 1. Fetch Document-based service applications for the authenticated citizen
    const docRequests = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
        sr.id,
        sr.amount,
        sr.status,
        sr.payment_date,
        sr.confirmed_date,
        sr.created_at,
        sr.uploaded_doc_path,
        sr.upload_date,
        sr.processed_doc_path,
        sr.signed_pdf_path,
        sr.signed_at,
        sr.rejection_reason,
        sr.purchase_notes,
        s.id AS service_id,
        s.name AS service_name,
        s.pdf_path AS template_pdf_path,
        st.name AS category_name
      FROM service_requests sr
      LEFT JOIN services s ON sr.service_id = s.id
      LEFT JOIN service_types st ON s.service_type_id = st.id
      WHERE sr.customer_id = ? OR sr.user_id = ?
      ORDER BY sr.id DESC`,
      customerId,
      customerId
    ).catch(() => []);

    // 2. Fetch E-service applications for the authenticated citizen
    const esRequests = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
        er.id,
        er.application_number,
        er.amount,
        er.payment_status,
        er.status,
        er.admin_remark,
        er.submitted_data,
        er.submitted_files,
        er.created_at,
        er.updated_at,
        es.id AS service_id,
        es.service_name,
        em.category_name
      FROM es_service_requests er
      LEFT JOIN es_services es ON er.service_id = es.id
      LEFT JOIN es_main_categories em ON es.main_category_id = em.id
      WHERE er.user_id = ?
      ORDER BY er.id DESC`,
      customerId
    ).catch(() => []);


    const applications: any[] = [];

    // Map Document Services
    for (const sr of docRequests) {
      let notes: any = {};
      try {
        notes = JSON.parse(sr.purchase_notes || "{}");
      } catch {}

      const appRef = notes.appRef || `TN-DOC-2026-${String(sr.id).padStart(6, "0")}`;
      const receiptNo = notes.receiptNo || `TN-RCP-DOC-${String(sr.id).padStart(6, "0")}`;

      applications.push({
        id: `DOC-${sr.id}`,
        dbId: sr.id,
        appNumber: appRef,
        receiptNo,
        serviceType: "DOCUMENT_SERVICE",
        serviceId: sr.service_id,
        serviceName: sr.service_name || "Statutory Document Scheme",
        categoryName: sr.category_name || "Document Services",
        status: sr.status || "confirmed",
        amount: Number(sr.amount || 0),
        appliedDate: sr.created_at || sr.payment_date || new Date().toISOString(),
        paymentDate: sr.payment_date,
        templatePdfPath: normalizeAssetPath(sr.template_pdf_path) || null,
        uploadedDocPath: normalizeAssetPath(sr.uploaded_doc_path) || null,
        uploadDate: sr.upload_date || null,
        signedPdfPath: normalizeAssetPath(sr.signed_pdf_path) || null,
        signedAt: sr.signed_at || null,
        rejectionReason: sr.rejection_reason || null,
        notes,
      });
    }

    // Map E-Services
    for (const er of esRequests) {
      let data: any = {};
      let files: any = {};
      try {
        data = typeof er.submitted_data === "string" ? JSON.parse(er.submitted_data) : er.submitted_data || {};
        files = typeof er.submitted_files === "string" ? JSON.parse(er.submitted_files) : er.submitted_files || {};
      } catch {}

      const appRef = er.application_number || `TN-ES-2026-${String(er.id).padStart(6, "0")}`;
      const receiptNo = data._receiptNo || `TN-RCP-ES-${String(er.id).padStart(6, "0")}`;

      applications.push({
        id: `ES-${er.id}`,
        dbId: er.id,
        appNumber: appRef,
        receiptNo,
        serviceType: "E_SERVICE",
        serviceId: er.service_id,
        serviceName: er.service_name || "Online Application",
        categoryName: er.category_name || "E-Services",
        status: er.status || "accepted",
        paymentStatus: er.payment_status || "Success",
        amount: Number(er.amount || 0),
        appliedDate: er.created_at || new Date().toISOString(),
        adminRemark: er.admin_remark || null,
        submittedData: data,
        submittedFiles: files,
      });
    }

    // Sort by appliedDate descending
    applications.sort((a, b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime());

    return NextResponse.json({
      ok: true,
      applications,
      count: applications.length,
    });
  } catch (error: any) {
    console.error("GET /api/user/applications error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load user applications" },
      { status: 500 }
    );
  }
}
