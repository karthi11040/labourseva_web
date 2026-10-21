import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signDocumentWithDistrict } from "@/lib/district-signer";

export const dynamic = "force-dynamic";

export interface UnifiedRequestItem {
  id: string;
  sourceTable: "service_requests" | "es_service_requests" | "guest_service_orders" | "retail_orders";
  sourceId: number;
  referenceNo: string;
  requestorType: "CUSTOMER" | "RETAILER" | "GUEST" | "DISTRIBUTOR";
  requestorLabel: string;
  serviceCategory: "STATUTORY" | "E_SERVICE";
  serviceCategoryLabel: string;
  serviceId: number;
  serviceName: string;
  amount: number;
  paymentStatus: "PAID" | "PENDING" | "FAILED";
  paymentMethod: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "RETURNED";
  statusDisplay: string;
  applicantName: string;
  applicantPhone: string;
  district: string;
  taluk: string;
  panchayat: string;
  address: string;
  submittedData: Record<string, any>;
  submittedFiles: Array<{ name: string; url?: string }>;
  officerRemarks: string;
  createdAt: string;
  updatedAt: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestorFilter = (searchParams.get("requestor_type") || "ALL").toUpperCase();
    const categoryFilter = (searchParams.get("service_category") || "ALL").toUpperCase();
    const statusFilter = (searchParams.get("status") || "ALL").toUpperCase();
    const search = (searchParams.get("search") || "").trim().toLowerCase();

    const records: UnifiedRequestItem[] = [];
    const seenTxns = new Set<string>();
    const seenRefs = new Set<string>();

    // 1. Fetch geo districts map
    const districts = await prisma.$queryRawUnsafe<any[]>(`SELECT id, name, name_en FROM districts`).catch(() => []);
    const distMap = new Map<number, string>();
    districts.forEach((d) => distMap.set(d.id, d.name_en || d.name));

    // 2. Fetch guests map
    const guests = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name, phone, email, address, district_id FROM guests`
    ).catch(() => []);
    const guestMap = new Map<number, any>();
    guests.forEach((g) => guestMap.set(g.id, g));

    // 3. Query Statutory Service Requests (`service_requests`)
    const srRows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT sr.*, s.name as service_name, s.type as service_type
      FROM service_requests sr
      LEFT JOIN services s ON sr.service_id = s.id
      ORDER BY sr.id DESC
    `).catch(() => []);

    for (const sr of srRows) {
      let pNotes: Record<string, any> = {};
      try {
        pNotes = typeof sr.purchase_notes === "string" ? JSON.parse(sr.purchase_notes) : (sr.purchase_notes || {});
      } catch {
        pNotes = {};
      }

      if (sr.transaction_id) seenTxns.add(String(sr.transaction_id));
      if (pNotes.receiptNo) seenTxns.add(String(pNotes.receiptNo));
      if (pNotes.appRef) seenRefs.add(String(pNotes.appRef));

      // Determine requestor type
      let requestorType: "CUSTOMER" | "RETAILER" | "GUEST" = "CUSTOMER";
      let requestorLabel = "Citizen Beneficiary";

      if (sr.gateway_provider === "KENDRA_WALLET" || pNotes.assistedKendraId || pNotes.assistedKendraShop) {
        requestorType = "RETAILER";
        requestorLabel = `Retailer: ${pNotes.assistedKendraShop || "Kendra Desk"}`;
      } else if (sr.guest_id) {
        requestorType = "GUEST";
        requestorLabel = "Walk-in Guest";
      }

      let applicantName = pNotes.applicantName || "";
      let applicantPhone = pNotes.applicantPhone || "";
      let district = pNotes.district || distMap.get(sr.district_id) || "";
      let taluk = pNotes.taluk || "";
      let panchayat = pNotes.panchayat || "";
      let address = pNotes.address || "";

      if (sr.guest_id && guestMap.has(sr.guest_id)) {
        const g = guestMap.get(sr.guest_id);
        if (!applicantName) applicantName = g.name || "";
        if (!applicantPhone) applicantPhone = g.phone || "";
        if (!address) address = g.address || "";
        if (!district && g.district_id) district = distMap.get(g.district_id) || "";
      }

      if (!applicantName) {
        applicantName =
          requestorType === "GUEST"
            ? `Guest #${sr.guest_id || sr.id}`
            : `Citizen User #${sr.user_id || sr.customer_id || sr.id}`;
      }

      let status: "PENDING" | "APPROVED" | "REJECTED" | "RETURNED" = "PENDING";
      const rawSt = String(sr.status || "").toLowerCase();
      if (rawSt === "confirmed" || rawSt === "approved" || rawSt === "completed" || rawSt === "paid") {
        status = "APPROVED";
      } else if (rawSt === "rejected" || rawSt === "cancelled") {
        status = "REJECTED";
      } else if (rawSt === "returned") {
        status = "RETURNED";
      }

      records.push({
        id: `SR-${sr.id}`,
        sourceTable: "service_requests",
        sourceId: Number(sr.id),
        referenceNo: pNotes.appRef || `TN-DOC-2026-${String(sr.id).padStart(6, "0")}`,
        requestorType,
        requestorLabel,
        serviceCategory: "STATUTORY",
        serviceCategoryLabel: "Statutory Board Service",
        serviceId: Number(sr.service_id || 0),
        serviceName: sr.service_name
          ? `${sr.service_name} (${sr.service_type || "Scheme"})`
          : (pNotes.serviceName || `Statutory Scheme #${sr.service_id}`),
        amount: Number(sr.amount || 0),
        paymentStatus: (rawSt === "paid" || rawSt === "confirmed" || rawSt === "completed") ? "PAID" : "PENDING",
        paymentMethod: sr.gateway_provider || sr.payment_method || "Online Payment",
        status,
        statusDisplay: sr.status || status,
        applicantName,
        applicantPhone,
        district,
        taluk,
        panchayat,
        address,
        submittedData: pNotes,
        submittedFiles: sr.uploaded_doc_path ? [{ name: "Applicant Proof", url: sr.uploaded_doc_path }] : [],
        officerRemarks: sr.rejection_reason || "",
        createdAt: sr.created_at ? new Date(sr.created_at).toISOString() : new Date().toISOString(),
        updatedAt: sr.signed_at
          ? new Date(sr.signed_at).toISOString()
          : sr.created_at
          ? new Date(sr.created_at).toISOString()
          : new Date().toISOString(),
      });
    }

    // 4. Query Citizen E-Services (`es_service_requests`)
    const esRows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT esr.*, es.service_name
      FROM es_service_requests esr
      LEFT JOIN es_services es ON esr.service_id = es.id
      ORDER BY esr.id DESC
    `).catch(() => []);

    for (const es of esRows) {
      let sData: Record<string, any> = {};
      let sFiles: Array<{ name: string; url?: string }> = [];
      try {
        sData = typeof es.submitted_data === "string" ? JSON.parse(es.submitted_data) : (es.submitted_data || {});
      } catch {
        sData = {};
      }
      try {
        const rawFiles =
          typeof es.submitted_files === "string" ? JSON.parse(es.submitted_files) : (es.submitted_files || []);
        if (Array.isArray(rawFiles)) {
          sFiles = rawFiles.map((f: any) => ({
            name: typeof f === "string" ? f : f.name || f.key || "Document",
            url: typeof f === "string" ? f : f.url || f.path || undefined,
          }));
        } else if (typeof rawFiles === "object") {
          sFiles = Object.entries(rawFiles).map(([k, v]) => ({ name: k, url: String(v) }));
        }
      } catch {
        sFiles = [];
      }

      let reqType: "CUSTOMER" | "RETAILER" | "GUEST" | "DISTRIBUTOR" = "CUSTOMER";
      let reqLabel = "Citizen Direct (Customer)";
      const ct = String(es.creator_type || "").toLowerCase();
      if (ct === "retailer") {
        reqType = "RETAILER";
        reqLabel = "Assisted Retail CSC Agent";
      } else if (ct === "guest") {
        reqType = "GUEST";
        reqLabel = "Walk-in Guest Form";
      } else if (ct === "distributor") {
        reqType = "DISTRIBUTOR";
        reqLabel = "Zonal Distributor";
      }

      const appName = sData.applicantName || sData._applicantName || sData.name || `E-Citizen #${es.id}`;
      const appPhone = sData.applicantPhone || sData._applicantPhone || sData.phone || sData.mobile || "";
      const dist = sData.district || "";
      const tlk = sData.taluk || "";
      const pch = sData.panchayat || "";
      const addr = sData.address || "";

      let status: "PENDING" | "APPROVED" | "REJECTED" | "RETURNED" = "PENDING";
      const rawSt = String(es.status || "").toLowerCase();
      if (rawSt === "accepted" || rawSt === "approved") status = "APPROVED";
      else if (rawSt === "rejected") status = "REJECTED";
      else if (rawSt === "returned") status = "RETURNED";

      records.push({
        id: `ES-${es.id}`,
        sourceTable: "es_service_requests",
        sourceId: Number(es.id),
        referenceNo: es.application_number || `TN-ES-2026-${String(es.id).padStart(6, "0")}`,
        requestorType: reqType,
        requestorLabel: reqLabel,
        serviceCategory: "E_SERVICE",
        serviceCategoryLabel: "Citizen E-Service",
        serviceId: Number(es.service_id || 0),
        serviceName: es.service_name || `E-Service #${es.service_id}`,
        amount: Number(es.amount || 0),
        paymentStatus:
          String(es.payment_status).toLowerCase() === "success" || String(es.payment_status).toLowerCase() === "paid"
            ? "PAID"
            : "PENDING",
        paymentMethod: es.razorpay_order_id ? "Razorpay" : "Direct Portal",
        status,
        statusDisplay: es.status || status,
        applicantName: appName,
        applicantPhone: appPhone,
        district: dist,
        taluk: tlk,
        panchayat: pch,
        address: addr,
        submittedData: sData,
        submittedFiles: sFiles,
        officerRemarks: es.admin_remark || "",
        createdAt: es.created_at ? new Date(es.created_at).toISOString() : new Date().toISOString(),
        updatedAt: es.updated_at ? new Date(es.updated_at).toISOString() : new Date().toISOString(),
      });
    }

    // 5. Query Guest Service Orders (`guest_service_orders`)
    const gsoRows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT gso.*, s.name as service_name, s.type as service_type
      FROM guest_service_orders gso
      LEFT JOIN services s ON gso.service_id = s.id
      ORDER BY gso.id DESC
    `).catch(() => []);

    for (const gso of gsoRows) {
      if (gso.transaction_id && seenTxns.has(String(gso.transaction_id))) continue;
      if (gso.razorpay_order_id && seenTxns.has(String(gso.razorpay_order_id))) continue;

      let appName = "";
      let appPhone = "";
      let addr = "";
      if (gso.guest_id && guestMap.has(gso.guest_id)) {
        const g = guestMap.get(gso.guest_id);
        appName = g.name || "";
        appPhone = g.phone || "";
        addr = g.address || "";
      }
      if (!appName) appName = `Guest Applicant #${gso.guest_id || gso.id}`;

      let status: "PENDING" | "APPROVED" | "REJECTED" | "RETURNED" = "PENDING";
      const rawSt = String(gso.payment_status || "").toLowerCase();
      if (rawSt === "paid" || rawSt === "success") status = "APPROVED";

      records.push({
        id: `GSO-${gso.id}`,
        sourceTable: "guest_service_orders",
        sourceId: Number(gso.id),
        referenceNo: `TN-GUEST-${String(gso.id).padStart(6, "0")}`,
        requestorType: "GUEST",
        requestorLabel: "Walk-in Guest Order",
        serviceCategory: "STATUTORY",
        serviceCategoryLabel: "Statutory Board Service",
        serviceId: Number(gso.service_id || 0),
        serviceName: gso.service_name
          ? `${gso.service_name} (${gso.service_type || "Scheme"})`
          : `Statutory Service #${gso.service_id}`,
        amount: Number(gso.amount || 0),
        paymentStatus: (rawSt === "paid" || rawSt === "success") ? "PAID" : "PENDING",
        paymentMethod: gso.razorpay_order_id ? "Razorpay" : (gso.payu_payment_mode || "Payment Gateway"),
        status,
        statusDisplay: gso.payment_status || status,
        applicantName: appName,
        applicantPhone: appPhone,
        district: gso.district || (gso.district_id ? distMap.get(gso.district_id) : "") || "",
        taluk: gso.taluk || "",
        panchayat: gso.panchayat || "",
        address: addr,
        submittedData: {
          transactionId: gso.transaction_id,
          orderId: gso.razorpay_order_id,
          district: gso.district,
          taluk: gso.taluk,
          panchayat: gso.panchayat,
        },
        submittedFiles: [],
        officerRemarks: gso.remarks || "",
        createdAt: gso.created_at ? new Date(gso.created_at).toISOString() : new Date().toISOString(),
        updatedAt: gso.updated_at ? new Date(gso.updated_at).toISOString() : new Date().toISOString(),
      });
    }

    // 6. Query Retail Kendra Orders (`retail_orders`)
    const roRows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT ro.*, s.name as service_name, s.type as service_type, u.full_name as retailer_name
      FROM retail_orders ro
      LEFT JOIN services s ON ro.service_id = s.id
      LEFT JOIN users u ON ro.user_id = u.id
      ORDER BY ro.id DESC
    `).catch(() => []);

    for (const ro of roRows) {
      if (ro.transaction_id && seenTxns.has(String(ro.transaction_id))) continue;

      let pResp: Record<string, any> = {};
      try {
        pResp = typeof ro.payment_response === "string" ? JSON.parse(ro.payment_response) : (ro.payment_response || {});
      } catch {
        pResp = {};
      }

      if (pResp.appRef && seenRefs.has(String(pResp.appRef))) continue;

      const appName = pResp.applicantName || `Kendra Applicant (Desk #${ro.user_id})`;
      const appPhone = pResp.applicantPhone || "";

      let status: "PENDING" | "APPROVED" | "REJECTED" | "RETURNED" = "PENDING";
      const rawSt = String(ro.status || "").toLowerCase();
      if (rawSt === "approved" || rawSt === "completed") status = "APPROVED";
      else if (rawSt === "rejected") status = "REJECTED";

      records.push({
        id: `RO-${ro.id}`,
        sourceTable: "retail_orders",
        sourceId: Number(ro.id),
        referenceNo: pResp.appRef || `RO-KND-${String(ro.id).padStart(6, "0")}`,
        requestorType: "RETAILER",
        requestorLabel: ro.retailer_name ? `Retailer: ${ro.retailer_name}` : `Retail Kendra #${ro.user_id}`,
        serviceCategory: "STATUTORY",
        serviceCategoryLabel: "Statutory Board Service",
        serviceId: Number(ro.service_id || 0),
        serviceName: ro.service_name
          ? `${ro.service_name} (${ro.service_type || "Scheme"})`
          : (pResp.serviceName || `Statutory Scheme #${ro.service_id}`),
        amount: Number(ro.amount || 0),
        paymentStatus: String(ro.payment_status).toLowerCase() === "success" ? "PAID" : "PENDING",
        paymentMethod: "Kendra Wallet Account",
        status,
        statusDisplay: ro.status || status,
        applicantName: appName,
        applicantPhone: appPhone,
        district: ro.district_id ? (distMap.get(ro.district_id) || "") : "",
        taluk: "",
        panchayat: "",
        address: "",
        submittedData: pResp,
        submittedFiles: ro.document_path ? [{ name: "Application Document", url: ro.document_path }] : [],
        officerRemarks: ro.rejection_reason || "",
        createdAt: ro.created_at ? new Date(ro.created_at).toISOString() : new Date().toISOString(),
        updatedAt: ro.updated_at ? new Date(ro.updated_at).toISOString() : new Date().toISOString(),
      });
    }

    // Sort descending by creation date
    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Compute metrics
    const stats = {
      total: records.length,
      customerCount: records.filter((r) => r.requestorType === "CUSTOMER").length,
      retailerCount: records.filter((r) => r.requestorType === "RETAILER").length,
      guestCount: records.filter((r) => r.requestorType === "GUEST").length,
      statutoryCount: records.filter((r) => r.serviceCategory === "STATUTORY").length,
      eserviceCount: records.filter((r) => r.serviceCategory === "E_SERVICE").length,
      pendingCount: records.filter((r) => r.status === "PENDING").length,
      approvedCount: records.filter((r) => r.status === "APPROVED").length,
      rejectedCount: records.filter((r) => r.status === "REJECTED").length,
      returnedCount: records.filter((r) => r.status === "RETURNED").length,
    };

    // Apply Filters
    let filtered = records;

    if (requestorFilter !== "ALL") {
      filtered = filtered.filter((r) => r.requestorType === requestorFilter);
    }

    if (categoryFilter !== "ALL") {
      filtered = filtered.filter((r) => r.serviceCategory === categoryFilter);
    }

    if (statusFilter !== "ALL") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    if (search) {
      filtered = filtered.filter((r) => {
        return (
          r.referenceNo.toLowerCase().includes(search) ||
          r.applicantName.toLowerCase().includes(search) ||
          r.applicantPhone.includes(search) ||
          r.serviceName.toLowerCase().includes(search) ||
          r.district.toLowerCase().includes(search) ||
          r.taluk.toLowerCase().includes(search) ||
          r.panchayat.toLowerCase().includes(search) ||
          r.id.toLowerCase().includes(search)
        );
      });
    }

    return NextResponse.json({
      ok: true,
      stats,
      totalRecords: records.length,
      filteredCount: filtered.length,
      records: filtered,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to query service requests." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, sourceTable, sourceId, status, remark } = body;

    if (!sourceTable || !sourceId || !status) {
      return NextResponse.json(
        { ok: false, error: "Missing required parameters (sourceTable, sourceId, status)." },
        { status: 400 }
      );
    }

    const note = (remark || "").trim();

    if (sourceTable === "service_requests") {
      const sId = Number(sourceId);
      // Fetch request details for notification
      const [sr] = await prisma.$queryRawUnsafe<any[]>(
        `SELECT sr.*, s.name as service_name 
         FROM service_requests sr 
         LEFT JOIN services s ON sr.service_id = s.id 
         WHERE sr.id = ? LIMIT 1`,
        sId
      ).catch(() => []);

      let pNotes: Record<string, any> = {};
      try {
        pNotes = typeof sr?.purchase_notes === "string" ? JSON.parse(sr.purchase_notes) : (sr?.purchase_notes || {});
      } catch {
        pNotes = {};
      }
      const appRef = pNotes.appRef || `DOC-${sId}`;
      const applicantName = pNotes.applicantName || "Applicant";
      const applicantEmail = pNotes.applicantEmail || "";
      const sName = sr?.service_name || "Document Statutory Service";

      if (status === "APPROVED") {
        // Digitally sign document using the district specified by the user in the request
        const signRes = await signDocumentWithDistrict(sId);
        if (!signRes.ok) {
          console.warn(`District signing notice for SR #${sId}:`, signRes.error);
        }
        await prisma.$queryRawUnsafe(
          `UPDATE service_requests SET status = 'approved', rejection_reason = ?, signed_at = NOW() WHERE id = ?`,
          note || null,
          sId
        );

        try {
          const { dispatchServiceApplicationApprovedNotification, dispatchSignedDocumentReadyNotification } = await import("@/lib/notification-service");
          await dispatchServiceApplicationApprovedNotification({
            userId: sr?.user_id || "1",
            name: applicantName,
            email: applicantEmail,
            serviceName: sName,
            applicationRef: appRef,
            serviceType: "DOCUMENT_SERVICE",
          });
          await dispatchSignedDocumentReadyNotification({
            userId: sr?.user_id || "1",
            name: applicantName,
            email: applicantEmail,
            serviceName: sName,
            applicationRef: appRef,
          });

          // Idempotent In-App Modular Triggers
          const { NotificationTriggerService } = await import("@/modules/notifications/services/notification-trigger.service");
          await NotificationTriggerService.triggerApplicationApproved({
            userId: String(sr?.user_id || "1"),
            applicationId: `DOC-${sId}`,
            applicationNumber: appRef,
            serviceName: sName,
            type: "DOCUMENT_SERVICE",
            email: applicantEmail,
          });
          await NotificationTriggerService.triggerSignedDocumentReady({
            userId: String(sr?.user_id || "1"),
            applicationId: `DOC-${sId}`,
            applicationNumber: appRef,
            serviceName: sName,
            signedPdfPath: `/api/admin/service-signing?id=${sId}&download=true`,
            email: applicantEmail,
          });
        } catch (notifErr) {
          console.warn("[SR Approval Notification Warning]:", notifErr);
        }
      } else if (status === "RETURNED") {
        await prisma.$queryRawUnsafe(
          `UPDATE service_requests SET status = 'returned', rejection_reason = ?, updated_at = NOW() WHERE id = ?`,
          note || "Document resubmission requested by verification desk.",
          sId
        );

        try {
          const { dispatchApplicationInformationRequestedNotification } = await import("@/lib/notification-service");
          await dispatchApplicationInformationRequestedNotification({
            userId: sr?.user_id || "1",
            name: applicantName,
            email: applicantEmail,
            serviceName: sName,
            applicationRef: appRef,
            instructions: note || "Please re-upload your document as requested by verification desk.",
          });

          // Idempotent In-App Modular Trigger
          const { NotificationTriggerService } = await import("@/modules/notifications/services/notification-trigger.service");
          await NotificationTriggerService.triggerAdditionalInfoRequested({
            userId: String(sr?.user_id || "1"),
            applicationId: `DOC-${sId}`,
            applicationNumber: appRef,
            notes: note || "Please re-upload your document as requested by verification desk.",
            email: applicantEmail,
          });
        } catch (notifErr) {
          console.warn("[SR Returned Notification Warning]:", notifErr);
        }
      } else if (status === "REJECTED") {
        if (sr?.gateway_payment_id) {
          const { refundRejectedApplication } = await import("@/lib/application-refund");
          await refundRejectedApplication({
            paymentId: sr.gateway_payment_id,
            orderId: sr.gateway_order_id,
            amountRupees: Number(sr.amount || 0),
            applicationReference: appRef,
          });
        } else if (String(sr?.gateway_provider || "").toUpperCase() === "KENDRA_WALLET" && pNotes.assistedKendraId) {
          const { refundRetailerWallet } = await import("@/lib/application-refund");
          await refundRetailerWallet({ retailerId: pNotes.assistedKendraId, amountRupees: Number(sr.amount || 0), applicationReference: appRef });
        }
        await prisma.$queryRawUnsafe(
          `UPDATE service_requests SET status = 'rejected', rejection_reason = ?, updated_at = NOW() WHERE id = ?`,
          note || "Application rejected by verification desk.",
          sId
        );

        try {
          const { dispatchApplicationRejectedNotification } = await import("@/lib/notification-service");
          await dispatchApplicationRejectedNotification({
            userId: sr?.user_id || "1",
            name: applicantName,
            email: applicantEmail,
            serviceName: sName,
            applicationRef: appRef,
            reason: note || "Application rejected by verification desk.",
          });

          // Idempotent In-App Modular Trigger
          const { NotificationTriggerService } = await import("@/modules/notifications/services/notification-trigger.service");
          await NotificationTriggerService.triggerApplicationRejected({
            userId: String(sr?.user_id || "1"),
            applicationId: `DOC-${sId}`,
            applicationNumber: appRef,
            serviceName: sName,
            reason: note || "Application rejected by verification desk.",
            type: "DOCUMENT_SERVICE",
            email: applicantEmail,
          });
        } catch (notifErr) {
          console.warn("[SR Rejection Notification Warning]:", notifErr);
        }
      } else {
        await prisma.$queryRawUnsafe(
          `UPDATE service_requests SET status = 'pending', rejection_reason = ? WHERE id = ?`,
          note || null,
          sId
        );
      }
    } else if (sourceTable === "es_service_requests") {
      const dbStatus =
        status === "APPROVED" ? "accepted" : status === "REJECTED" ? "rejected" : status === "RETURNED" ? "returned" : "pending";
      await prisma.$queryRawUnsafe(
        `UPDATE es_service_requests SET status = ?, admin_remark = ?, updated_at = NOW() WHERE id = ?`,
        dbStatus,
        note || null,
        Number(sourceId)
      );

      try {
        const [esr] = await prisma.$queryRawUnsafe<any[]>(
          `SELECT esr.*, es.service_name 
           FROM es_service_requests esr 
           LEFT JOIN es_services es ON esr.service_id = es.id 
           WHERE esr.id = ? LIMIT 1`,
          Number(sourceId)
        ).catch(() => []);

        let sData: Record<string, any> = {};
        try {
          sData = typeof esr?.submitted_data === "string" ? JSON.parse(esr.submitted_data) : (esr?.submitted_data || {});
        } catch {
          sData = {};
        }

        const appRef = esr?.application_number || `TN-ES-${sourceId}`;
        const applicantName = sData.applicantName || sData._applicantName || sData.name || "E-Citizen";
        const applicantEmail = sData.applicantEmail || sData._applicantEmail || sData.email || "";
        const serviceName = esr?.service_name || "Online E-Service";

        if (status === "APPROVED") {
          const { dispatchServiceApplicationApprovedNotification } = await import("@/lib/notification-service");
          await dispatchServiceApplicationApprovedNotification({
            userId: esr?.user_id || "1",
            name: applicantName,
            email: applicantEmail,
            serviceName,
            applicationRef: appRef,
            serviceType: "E_SERVICE",
          });

          // Idempotent In-App Modular Trigger
          const { NotificationTriggerService } = await import("@/modules/notifications/services/notification-trigger.service");
          await NotificationTriggerService.triggerApplicationApproved({
            userId: String(esr?.user_id || "1"),
            applicationId: `ES-${sourceId}`,
            applicationNumber: appRef,
            serviceName,
            type: "ESERVICE",
            email: applicantEmail,
          });
        } else if (status === "REJECTED") {
          if (esr?.razorpay_payment_id) {
            const { refundRejectedApplication } = await import("@/lib/application-refund");
            await refundRejectedApplication({
              paymentId: esr.razorpay_payment_id,
              orderId: esr.razorpay_order_id,
              amountRupees: Number(esr.amount || 0),
              applicationReference: appRef,
            });
          } else if (esr?.retailer_id) {
            const { refundRetailerWallet } = await import("@/lib/application-refund");
            await refundRetailerWallet({ retailerId: esr.retailer_id, amountRupees: Number(esr.amount || 0), applicationReference: appRef });
          }
          const { dispatchApplicationRejectedNotification } = await import("@/lib/notification-service");
          await dispatchApplicationRejectedNotification({
            userId: esr?.user_id || "1",
            name: applicantName,
            email: applicantEmail,
            serviceName,
            applicationRef: appRef,
            reason: note || "Application rejected by reviewer.",
          });

          // Idempotent In-App Modular Trigger
          const { NotificationTriggerService } = await import("@/modules/notifications/services/notification-trigger.service");
          await NotificationTriggerService.triggerApplicationRejected({
            userId: String(esr?.user_id || "1"),
            applicationId: `ES-${sourceId}`,
            applicationNumber: appRef,
            serviceName,
            reason: note || "Application rejected by reviewer.",
            type: "ESERVICE",
            email: applicantEmail,
          });
        } else if (status === "RETURNED") {
          const { dispatchApplicationInformationRequestedNotification } = await import("@/lib/notification-service");
          await dispatchApplicationInformationRequestedNotification({
            userId: esr?.user_id || "1",
            name: applicantName,
            email: applicantEmail,
            serviceName,
            applicationRef: appRef,
            instructions: note || "Additional details requested by review desk.",
          });

          // Idempotent In-App Modular Trigger
          const { NotificationTriggerService } = await import("@/modules/notifications/services/notification-trigger.service");
          await NotificationTriggerService.triggerAdditionalInfoRequested({
            userId: String(esr?.user_id || "1"),
            applicationId: `ES-${sourceId}`,
            applicationNumber: appRef,
            notes: note || "Additional details requested by review desk.",
            email: applicantEmail,
          });
        }
      } catch (esNotifErr) {
        console.warn("[ES Approval Notification Warning]:", esNotifErr);
      }
    } else if (sourceTable === "guest_service_orders") {
      const dbStatus = status === "APPROVED" ? "paid" : status === "REJECTED" ? "failed" : "pending";
      await prisma.$queryRawUnsafe(
        `UPDATE guest_service_orders SET payment_status = ?, remarks = ?, updated_at = NOW() WHERE id = ?`,
        dbStatus,
        note || null,
        Number(sourceId)
      );
    } else if (sourceTable === "retail_orders") {
      const dbStatus = status === "APPROVED" ? "approved" : status === "REJECTED" ? "rejected" : "pending";
      if (status === "REJECTED") {
        const [retailOrder] = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM retail_orders WHERE id = ? LIMIT 1`, Number(sourceId)).catch(() => []);
        let paymentInfo: any = {};
        try { paymentInfo = typeof retailOrder?.payment_response === "string" ? JSON.parse(retailOrder.payment_response) : (retailOrder?.payment_response || {}); } catch {}
        const appRef = paymentInfo.appRef || paymentInfo.applicationNumber || `RETAIL-${sourceId}`;
        if (retailOrder?.user_id) {
          const { refundRetailerWallet } = await import("@/lib/application-refund");
          await refundRetailerWallet({ retailerId: retailOrder.user_id, amountRupees: Number(retailOrder.amount || 0), applicationReference: appRef });
        }
      }
      await prisma.$queryRawUnsafe(
        `UPDATE retail_orders SET status = ?, rejection_reason = ?, updated_at = NOW() WHERE id = ?`,
        dbStatus,
        note || null,
        Number(sourceId)
      );
    } else {
      return NextResponse.json({ ok: false, error: "Invalid source table." }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: `Request ${id || sourceId} status updated to ${status}.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to update request." },
      { status: 500 }
    );
  }
}
