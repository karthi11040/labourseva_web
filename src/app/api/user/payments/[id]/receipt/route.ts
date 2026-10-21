import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateReceiptPdf, ReceiptData } from "@/lib/generateReceiptPdf";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const paymentId = params.id;

    if (!paymentId) {
      return NextResponse.json({ ok: false, error: "Payment ID required" }, { status: 400 });
    }

    let receiptData: ReceiptData | null = null;

    if (paymentId.startsWith("DOC-")) {
      const docId = Number(paymentId.replace("DOC-", ""));
      const rows = await prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          sr.id,
          sr.amount,
          sr.status,
          sr.payment_date,
          sr.confirmed_date,
          sr.created_at,
          sr.gateway_provider,
          sr.gateway_order_id,
          sr.gateway_payment_id,
          sr.payment_method,
          sr.purchase_notes,
          s.name AS service_name,
          st.name AS category_name
        FROM service_requests sr
        LEFT JOIN services s ON sr.service_id = s.id
        LEFT JOIN service_types st ON s.service_type_id = st.id
        WHERE sr.id = ${docId} LIMIT 1
      `).catch(() => []);

      if (!rows || rows.length === 0) {
        return NextResponse.json({ ok: false, error: "Payment record not found" }, { status: 404 });
      }

      const sr = rows[0];
      let notes: any = {};
      try {
        notes = JSON.parse(sr.purchase_notes || "{}");
      } catch {}

      const receiptNo = notes.receiptNo || `TN-RCP-DOC-${String(sr.id).padStart(6, "0")}`;
      const appRef = notes.appRef || `TN-DOC-2026-${String(sr.id).padStart(6, "0")}`;

      receiptData = {
        receiptNo,
        paymentReference: sr.gateway_payment_id || `PAY-DOC-${sr.id}`,
        applicationReference: appRef,
        serviceType: "DOCUMENT_SERVICE",
        categoryName: sr.category_name || "Document Services",
        serviceName: sr.service_name || "Statutory Worker Service",
        customerName: notes.applicantName || "Verified Citizen",
        customerPhone: notes.applicantPhone || "",
        amount: Number(sr.amount || 0),
        currency: "INR",
        paymentProvider: sr.gateway_provider || "RAZORPAY",
        paymentMethod: sr.payment_method || "UPI / Netbanking",
        razorpayOrderId: sr.gateway_order_id || `order_doc_${sr.id}`,
        razorpayPaymentId: sr.gateway_payment_id || `pay_doc_${sr.id}`,
        paymentStatus: "SUCCESS",
        paymentDate: sr.payment_date || sr.confirmed_date || sr.created_at || new Date().toISOString(),
      };
    } else if (paymentId.startsWith("ES-")) {
      const esId = Number(paymentId.replace("ES-", ""));
      const rows = await prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          er.id,
          er.application_number,
          er.amount,
          er.payment_status,
          er.razorpay_order_id,
          er.razorpay_payment_id,
          er.status,
          er.submitted_data,
          er.created_at,
          es.service_name,
          em.category_name
        FROM es_service_requests er
        LEFT JOIN es_services es ON er.service_id = es.id
        LEFT JOIN es_main_categories em ON es.main_category_id = em.id
        WHERE er.id = ${esId} LIMIT 1
      `).catch(() => []);

      if (!rows || rows.length === 0) {
        return NextResponse.json({ ok: false, error: "Payment record not found" }, { status: 404 });
      }

      const er = rows[0];
      let data: any = {};
      try {
        data = typeof er.submitted_data === "string" ? JSON.parse(er.submitted_data) : er.submitted_data || {};
      } catch {}

      const receiptNo = data._receiptNo || `TN-RCP-ES-${String(er.id).padStart(6, "0")}`;
      const appRef = er.application_number || `TN-ES-2026-${String(er.id).padStart(6, "0")}`;

      receiptData = {
        receiptNo,
        paymentReference: er.razorpay_payment_id || `PAY-ES-${er.id}`,
        applicationReference: appRef,
        serviceType: "E_SERVICE",
        categoryName: er.category_name || "E-Services",
        serviceName: er.service_name || "Online Application",
        customerName: data._applicantName || data.name || data.Name || "Verified Citizen",
        customerPhone: data._applicantPhone || data.phone || data.Phone || "",
        amount: Number(er.amount || 0),
        currency: "INR",
        paymentProvider: "RAZORPAY",
        paymentMethod: "UPI / Netbanking",
        razorpayOrderId: er.razorpay_order_id || `order_es_${er.id}`,
        razorpayPaymentId: er.razorpay_payment_id || `pay_es_${er.id}`,
        paymentStatus: "SUCCESS",
        paymentDate: er.created_at || new Date().toISOString(),
      };
    } else {
      return NextResponse.json({ ok: false, error: "Invalid payment format" }, { status: 400 });
    }

    const pdfBytes = await generateReceiptPdf(receiptData);

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Receipt_${receiptData.receiptNo}.pdf"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Receipt generation error:", error);
    return NextResponse.json({ ok: false, error: "Failed to generate receipt PDF" }, { status: 500 });
  }
}
