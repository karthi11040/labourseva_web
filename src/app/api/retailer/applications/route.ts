import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthRetailer } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const retailer = await getAuthRetailer(request);
    if (!retailer) {
      return NextResponse.json({ ok: false, error: "Unauthorized Kendra session" }, { status: 401 });
    }

    // 1. Fetch from retail_orders
    const orders = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
         ro.id,
         ro.service_id,
         ro.district_id,
         ro.amount,
         ro.payment_status,
         ro.status,
         ro.transaction_id,
         ro.payment_response,
         ro.document_path,
         ro.created_at,
         s.name AS service_name
       FROM retail_orders ro
       LEFT JOIN services s ON ro.service_id = s.id
       WHERE ro.user_id = ?
       ORDER BY ro.id DESC`,
      retailer.id
    ).catch(() => []);

    // 2. Fetch from es_service_requests
    const esRequests = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
         er.id,
         er.application_number,
         er.service_id,
         er.submitted_data,
         er.amount,
         er.payment_status,
         er.status,
         er.admin_remark,
         er.created_at,
         es.service_name
       FROM es_service_requests er
       LEFT JOIN es_services es ON er.service_id = es.id
       WHERE er.retailer_id = ?
       ORDER BY er.id DESC`,
      retailer.id
    ).catch(() => []);

    // 3. Fetch from statutory service_requests linked to Kendra orders
    const statutoryRequests = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
         sr.id,
         sr.service_id,
         sr.status,
         sr.gateway_order_id,
         sr.rejection_reason,
         sr.created_at
       FROM service_requests sr
       WHERE sr.gateway_provider = 'KENDRA_WALLET' AND sr.gateway_order_id IN (
         SELECT transaction_id FROM retail_orders WHERE user_id = ? AND transaction_id IS NOT NULL AND transaction_id <> ''
       )
       ORDER BY sr.id DESC`,
      retailer.id
    ).catch(() => []);

    const applications: any[] = [];

    // Map retail_orders first
    for (const ro of orders) {
      let meta: any = {};
      try {
        meta = JSON.parse(ro.payment_response || "{}");
      } catch {}

      const appRef = meta.appRef || `LS-ORD-${String(ro.id).padStart(6, "0")}`;
      const receiptNo = ro.transaction_id || `RCP-${ro.id}`;
      let initialStatus = String(ro.status || "pending").toLowerCase();
      let adminRemark: string | undefined = undefined;

      // Check if statutory scrutiny updated the status
      const matchingStatutory = statutoryRequests.find(sr => sr.gateway_order_id === ro.transaction_id);
      if (matchingStatutory && matchingStatutory.status) {
        initialStatus = String(matchingStatutory.status).toLowerCase();
        if (matchingStatutory.rejection_reason) {
          adminRemark = matchingStatutory.rejection_reason;
        }
      }

      applications.push({
        id: `ORD-${ro.id}`,
        appRef,
        receiptNo,
        applicantName: meta.applicantName || "Citizen Beneficiary",
        applicantPhone: meta.applicantPhone || "-",
        serviceName: ro.service_name || meta.serviceName || "Welfare Scheme",
        amount: Number(ro.amount || 0),
        paymentStatus: ro.payment_status,
        status: initialStatus,
        adminRemark,
        documentPath: ro.document_path,
        createdAt: ro.created_at,
      });
    }

    // Merge es_service_requests: Authoritatively synchronize scrutiny status & admin remark
    for (const er of esRequests) {
      let data: any = {};
      try {
        data = typeof er.submitted_data === "string" ? JSON.parse(er.submitted_data) : er.submitted_data || {};
      } catch {}

      const erAppRef = er.application_number || `LS-ES-${er.id}`;
      const normalizedErStatus = String(er.status || "pending").toLowerCase();

      // Find if this application reference was already logged in retail_orders
      const existing = applications.find(a => a.appRef === erAppRef || a.receiptNo === erAppRef);

      if (existing) {
        // Authoritative scrutiny update: es_service_requests has the live status (e.g. accepted, approved, completed, rejected, returned)
        if (normalizedErStatus) {
          existing.status = normalizedErStatus;
        }
        if (er.admin_remark) {
          existing.adminRemark = er.admin_remark;
        }
        if (er.service_name && existing.serviceName === "Welfare Scheme") {
          existing.serviceName = er.service_name;
        }
        if (data.fullName && existing.applicantName === "Citizen Beneficiary") {
          existing.applicantName = data.fullName;
        }
        if (data.phone && (!existing.applicantPhone || existing.applicantPhone === "-")) {
          existing.applicantPhone = data.phone;
        }
      } else {
        applications.push({
          id: `ES-${er.id}`,
          appRef: erAppRef,
          receiptNo: `RCP-ES-${er.id}`,
          applicantName: data.fullName || data.applicantName || "Citizen Beneficiary",
          applicantPhone: data.phone || data.applicantPhone || "-",
          serviceName: er.service_name || "Online Citizen E-Service",
          amount: Number(er.amount || 0),
          paymentStatus: er.payment_status || "Success",
          status: normalizedErStatus,
          adminRemark: er.admin_remark || undefined,
          createdAt: er.created_at,
        });
      }
    }

    return NextResponse.json({ ok: true, applications });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
