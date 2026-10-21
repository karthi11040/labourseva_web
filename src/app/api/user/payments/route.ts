import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCitizenIdentity } from "@/lib/auth-helpers";
import { ensurePaymentAttemptColumns } from "@/lib/payment-db-sync";
import {
  DISPLAY_STATUSES,
  REFUND_OUTCOMES,
  normalizeErrorReason,
  maskPaymentMethod,
  type PaymentDisplayStatus,
} from "@/lib/payment-status-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const citizen = await getCitizenIdentity(request);
    if (!citizen) {
      return NextResponse.json(
        { ok: false, error: "Authentication required to view payment history.", payments: [] },
        { status: 401 }
      );
    }

    const customerId = Number(citizen.customerId || 0);

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status"); // SUCCESSFUL, PENDING, FAILED, CANCELLED, REFUNDED, ALL
    const typeFilter = searchParams.get("serviceType"); // DOCUMENT_SERVICE, E_SERVICE, ALL
    const search = searchParams.get("q")?.toLowerCase().trim();
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    await ensurePaymentAttemptColumns();

    // 1. Fetch records from payment_attempts for this authenticated user
    const attemptRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM payment_attempts 
       WHERE user_id = ? OR customer_id = ? 
       ORDER BY id DESC`,
      customerId,
      customerId
    ).catch(() => []);

    const existingOrderIds = new Set<string>();
    for (const row of attemptRows) {
      if (row.razorpay_order_id) existingOrderIds.add(row.razorpay_order_id);
    }

    // 2. Fetch Document-based service payments for legacy backfill
    const docRequests = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
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
        s.id AS service_id,
        s.name AS service_name,
        st.name AS category_name
      FROM service_requests sr
      LEFT JOIN services s ON sr.service_id = s.id
      LEFT JOIN service_types st ON s.service_type_id = st.id
      WHERE (sr.customer_id = ? OR sr.user_id = ?)
      ORDER BY sr.id DESC`,
      customerId,
      customerId
    ).catch(() => []);

    // 3. Fetch E-service payments for legacy backfill
    const esRequests = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 
        er.id,
        er.application_number,
        er.amount,
        er.payment_status,
        er.razorpay_order_id,
        er.razorpay_payment_id,
        er.status,
        er.submitted_data,
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

    const payments: any[] = [];

    // Map rows from payment_attempts
    for (const att of attemptRows) {
      const displayStatus = (att.display_status || "INITIATED") as PaymentDisplayStatus;
      const meta = DISPLAY_STATUSES[displayStatus] || DISPLAY_STATUSES.INITIATED;

      let errorInfo = null;
      if (displayStatus === "FAILED" || displayStatus === "CANCELLED" || displayStatus === "TIMED_OUT" || att.error_reason) {
        errorInfo = normalizeErrorReason(att.error_reason, att.error_code, att.error_description);
      }

      const isSuccess = displayStatus === "SUCCESSFUL";
      const isFailed = displayStatus === "FAILED" || displayStatus === "CANCELLED" || displayStatus === "TIMED_OUT";
      const isRefunded = displayStatus === "REFUNDED" || displayStatus === "PARTIALLY_REFUNDED" || displayStatus === "REFUND_PROCESSING";

      const receiptNo = att.receipt_no || (isSuccess ? `TN-RCP-${att.service_type === "DOCUMENT_SERVICE" ? "DOC" : "ES"}-${String(att.id).padStart(6, "0")}` : null);
      const appRef = att.application_reference || (att.service_type === "DOCUMENT_SERVICE" ? `TN-DOC-2026-${String(att.id).padStart(6, "0")}` : `TN-ES-2026-${String(att.id).padStart(6, "0")}`);
      const maskedMethod = att.method_details || maskPaymentMethod(att.payment_method || "UPI");

      const timeline = [
        {
          event: "Payment Initiated",
          time: att.created_at || new Date().toISOString(),
          desc: `Order generated on LabourSeva platform (${att.razorpay_order_id || att.reference_id || "Order ID"}).`,
        },
      ];

      if (att.razorpay_order_id) {
        timeline.push({
          event: "Razorpay Checkout Session",
          time: att.created_at || new Date().toISOString(),
          desc: `Secure gateway order: ${att.razorpay_order_id}`,
        });
      }

      if (isSuccess) {
        timeline.push({
          event: "Payment Captured & Verified",
          time: att.captured_at || att.updated_at || att.created_at,
          desc: `Payment ID: ${att.razorpay_payment_id || `pay_${att.id}`}`,
        });
        if (receiptNo) {
          timeline.push({
            event: "Statutory Receipt Issued",
            time: att.captured_at || att.updated_at || att.created_at,
            desc: `Official Government Receipt #${receiptNo} logged into Treasury.`,
          });
        }
      } else if (displayStatus === "CANCELLED") {
        timeline.push({
          event: "Checkout Cancelled by User",
          time: att.updated_at || att.created_at,
          desc: "You cancelled the payment. No successful charge was confirmed.",
        });
      } else if (displayStatus === "TIMED_OUT") {
        timeline.push({
          event: "Payment Session Timed Out",
          time: att.updated_at || att.created_at,
          desc: "The payment session timed out before completion.",
        });
      } else if (displayStatus === "FAILED") {
        timeline.push({
          event: "Payment Declined / Failed",
          time: att.updated_at || att.created_at,
          desc: errorInfo?.userMessage || "Transaction declined by gateway or issuer bank.",
        });
      }

      if (isRefunded) {
        timeline.push({
          event: displayStatus === "REFUNDED" ? "Payment Fully Refunded" : "Partial Refund Processed",
          time: att.refunded_at || att.updated_at || att.created_at,
          desc: `Refund of ₹${Number(att.refund_amount || att.amount).toFixed(2)} processed (Ref: ${att.refund_reference || "N/A"}).`,
        });
      }

      payments.push({
        id: att.reference_id || `ATT-${att.id}`,
        dbId: att.id,
        serviceType: att.service_type || "DOCUMENT_SERVICE",
        receiptNo: receiptNo || "—",
        paymentReference: att.reference_id || `TXN-${att.id}`,
        applicationReference: appRef,
        categoryName: att.category_name || "Statutory Scheme",
        serviceName: att.service_name || "Labour Welfare Service",
        amount: Number(att.amount || 0),
        currency: att.currency || "INR",
        provider: "RAZORPAY",
        method: att.payment_method || "UPI",
        maskedMethod,
        razorpayOrderId: att.razorpay_order_id || null,
        razorpayPaymentId: att.razorpay_payment_id || null,
        status: isSuccess ? "SUCCESS" : isFailed ? "FAILED" : "PENDING",
        displayStatus,
        statusLabel: meta.label,
        statusLabelTa: meta.labelTa,
        statusMessage: att.status_message || meta.message,
        statusMessageTa: meta.messageTa,
        badgeVariant: meta.badgeVariant,
        errorReason: errorInfo?.reasonCode || att.error_reason || null,
        suggestedAction: att.suggested_action || errorInfo?.suggestedAction || null,
        refundStatus: att.refund_status || null,
        refundAmount: Number(att.refund_amount || 0),
        refundReference: att.refund_reference || null,
        paymentDate: att.created_at || new Date().toISOString(),
        capturedAt: att.captured_at || null,
        canDownloadReceipt: isSuccess,
        canRetry: isFailed,
        canReconcile: displayStatus === "VERIFICATION_PENDING" || displayStatus === "PENDING",
        timeline,
      });
    }

    // Merge legacy Document Service payments if not present in payment_attempts
    for (const sr of docRequests) {
      if (sr.gateway_order_id && existingOrderIds.has(sr.gateway_order_id)) {
        continue;
      }

      let notes: any = {};
      try {
        notes = JSON.parse(sr.purchase_notes || "{}");
      } catch {}

      const receiptNo = notes.receiptNo || `TN-RCP-DOC-${String(sr.id).padStart(6, "0")}`;
      const appRef = notes.appRef || `TN-DOC-2026-${String(sr.id).padStart(6, "0")}`;
      const isSuccess = sr.status === "confirmed" || sr.status === "paid" || sr.status === "completed" || sr.status === "active";
      const isPending = sr.status === "pending";
      const isFailed = sr.status === "rejected" || sr.status === "cancelled";

      const displayStatus: PaymentDisplayStatus = isSuccess ? "SUCCESSFUL" : isPending ? "PENDING" : "FAILED";
      const meta = DISPLAY_STATUSES[displayStatus];

      payments.push({
        id: `DOC-${sr.id}`,
        dbId: sr.id,
        serviceType: "DOCUMENT_SERVICE",
        receiptNo,
        paymentReference: sr.gateway_payment_id || `PAY-DOC-${sr.id}`,
        applicationReference: appRef,
        categoryName: sr.category_name || "Welfare Document Service",
        serviceName: sr.service_name || "Statutory Worker Service",
        amount: Number(sr.amount || 0),
        currency: "INR",
        provider: sr.gateway_provider || "RAZORPAY",
        method: sr.payment_method || "UPI",
        maskedMethod: maskPaymentMethod(sr.payment_method || "UPI"),
        razorpayOrderId: sr.gateway_order_id || `order_doc_${sr.id}`,
        razorpayPaymentId: sr.gateway_payment_id || `pay_doc_${sr.id}`,
        status: isSuccess ? "SUCCESS" : isPending ? "PENDING" : "FAILED",
        displayStatus,
        statusLabel: meta.label,
        statusLabelTa: meta.labelTa,
        statusMessage: meta.message,
        statusMessageTa: meta.messageTa,
        badgeVariant: meta.badgeVariant,
        errorReason: isFailed ? "payment_failed" : null,
        suggestedAction: isFailed ? "Check the status and try another method if needed." : null,
        refundStatus: null,
        refundAmount: 0,
        refundReference: null,
        paymentDate: sr.payment_date || sr.confirmed_date || sr.created_at || new Date().toISOString(),
        capturedAt: sr.confirmed_date || sr.payment_date || null,
        canDownloadReceipt: isSuccess,
        canRetry: isFailed,
        canReconcile: isPending,
        timeline: [
          { event: "Payment Initiated", time: sr.created_at || sr.payment_date, desc: "Order generated on LabourSeva platform." },
          { event: "Razorpay Checkout Opened", time: sr.created_at || sr.payment_date, desc: `Order ID: ${sr.gateway_order_id || `order_doc_${sr.id}`}` },
          { event: isSuccess ? "Payment Captured & Verified" : "Payment Pending", time: sr.payment_date || sr.confirmed_date, desc: isSuccess ? `Payment ID: ${sr.gateway_payment_id || `pay_doc_${sr.id}`}` : "Awaiting gateway callback." },
          ...(isSuccess ? [{ event: "Official Statutory Receipt Issued", time: sr.confirmed_date || sr.payment_date, desc: `Receipt #${receiptNo} logged into Treasury.` }] : []),
        ],
      });
    }

    // Merge legacy E-Service payments if not present in payment_attempts
    for (const er of esRequests) {
      if (er.razorpay_order_id && existingOrderIds.has(er.razorpay_order_id)) {
        continue;
      }

      let data: any = {};
      try {
        data = typeof er.submitted_data === "string" ? JSON.parse(er.submitted_data) : er.submitted_data || {};
      } catch {}

      const receiptNo = data._receiptNo || `TN-RCP-ES-${String(er.id).padStart(6, "0")}`;
      const appRef = er.application_number || `TN-ES-2026-${String(er.id).padStart(6, "0")}`;
      const isSuccess = er.payment_status === "Success" || er.status === "accepted";
      const isPending = er.payment_status === "Pending" && er.status === "pending";
      const isFailed = er.payment_status === "Failed" || er.status === "rejected";

      const displayStatus: PaymentDisplayStatus = isSuccess ? "SUCCESSFUL" : isPending ? "PENDING" : "FAILED";
      const meta = DISPLAY_STATUSES[displayStatus];

      payments.push({
        id: `ES-${er.id}`,
        dbId: er.id,
        serviceType: "E_SERVICE",
        receiptNo,
        paymentReference: er.razorpay_payment_id || `PAY-ES-${er.id}`,
        applicationReference: appRef,
        categoryName: er.category_name || "Online E-Service",
        serviceName: er.service_name || "E-Governance Application",
        amount: Number(er.amount || 0),
        currency: "INR",
        provider: "RAZORPAY",
        method: "UPI",
        maskedMethod: maskPaymentMethod("UPI"),
        razorpayOrderId: er.razorpay_order_id || `order_es_${er.id}`,
        razorpayPaymentId: er.razorpay_payment_id || `pay_es_${er.id}`,
        status: isSuccess ? "SUCCESS" : isPending ? "PENDING" : "FAILED",
        displayStatus,
        statusLabel: meta.label,
        statusLabelTa: meta.labelTa,
        statusMessage: meta.message,
        statusMessageTa: meta.messageTa,
        badgeVariant: meta.badgeVariant,
        errorReason: isFailed ? "payment_failed" : null,
        suggestedAction: isFailed ? "Check the status and try another method if needed." : null,
        refundStatus: null,
        refundAmount: 0,
        refundReference: null,
        paymentDate: er.created_at || new Date().toISOString(),
        capturedAt: er.updated_at || er.created_at || null,
        canDownloadReceipt: isSuccess,
        canRetry: isFailed,
        canReconcile: isPending,
        timeline: [
          { event: "E-Service Form Filled & Verified", time: er.created_at, desc: "Dynamic form parameters validated." },
          { event: "Razorpay Checkout Initiated", time: er.created_at, desc: `Order ID: ${er.razorpay_order_id || `order_es_${er.id}`}` },
          { event: isSuccess ? "Payment Verified & Form Submitted" : "Payment Awaiting Callback", time: er.updated_at || er.created_at, desc: isSuccess ? `Payment ID: ${er.razorpay_payment_id || `pay_es_${er.id}`}` : "Pending authorization." },
          ...(isSuccess ? [{ event: "Statutory E-Receipt Generated", time: er.updated_at || er.created_at, desc: `Receipt #${receiptNo} active.` }] : []),
        ],
      });
    }

    // Sort by paymentDate descending
    payments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

    // Apply filters
    let filtered = payments;

    if (typeFilter && typeFilter !== "ALL") {
      filtered = filtered.filter((p) => p.serviceType === typeFilter);
    }

    if (statusFilter && statusFilter !== "ALL") {
      filtered = filtered.filter((p) => {
        if (statusFilter === "SUCCESS" || statusFilter === "SUCCESSFUL") {
          return p.displayStatus === "SUCCESSFUL" || p.status === "SUCCESS";
        }
        if (statusFilter === "FAILED") {
          return p.displayStatus === "FAILED" || p.displayStatus === "CANCELLED" || p.displayStatus === "TIMED_OUT";
        }
        if (statusFilter === "PENDING") {
          return p.displayStatus === "PENDING" || p.displayStatus === "INITIATED" || p.displayStatus === "PROCESSING" || p.displayStatus === "VERIFICATION_PENDING";
        }
        if (statusFilter === "REFUNDED") {
          return p.displayStatus === "REFUNDED" || p.displayStatus === "PARTIALLY_REFUNDED" || p.displayStatus === "REFUND_PROCESSING";
        }
        return p.displayStatus === statusFilter;
      });
    }

    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime();
      filtered = filtered.filter((p) => new Date(p.paymentDate).getTime() >= fromTime);
    }

    if (dateTo) {
      const toTime = new Date(dateTo).getTime() + 86400000; // inclusive of end of day
      filtered = filtered.filter((p) => new Date(p.paymentDate).getTime() <= toTime);
    }

    if (search) {
      filtered = filtered.filter(
        (p) =>
          (p.receiptNo && p.receiptNo.toLowerCase().includes(search)) ||
          (p.applicationReference && p.applicationReference.toLowerCase().includes(search)) ||
          (p.serviceName && p.serviceName.toLowerCase().includes(search)) ||
          (p.categoryName && p.categoryName.toLowerCase().includes(search)) ||
          (p.razorpayPaymentId && p.razorpayPaymentId.toLowerCase().includes(search)) ||
          (p.razorpayOrderId && p.razorpayOrderId.toLowerCase().includes(search)) ||
          (p.paymentReference && p.paymentReference.toLowerCase().includes(search)) ||
          (p.errorReason && p.errorReason.toLowerCase().includes(search))
      );
    }

    // Summary KPIs
    const totalPaid = payments
      .filter((p) => p.displayStatus === "SUCCESSFUL" || p.status === "SUCCESS")
      .reduce((acc, p) => acc + (p.amount || 0), 0);
    const successfulCount = payments.filter((p) => p.displayStatus === "SUCCESSFUL" || p.status === "SUCCESS").length;
    const failedCount = payments.filter((p) => p.displayStatus === "FAILED" || p.displayStatus === "CANCELLED" || p.displayStatus === "TIMED_OUT").length;
    const refundCount = payments.filter((p) => p.displayStatus === "REFUNDED" || p.displayStatus === "PARTIALLY_REFUNDED").length;

    return NextResponse.json({
      ok: true,
      payments: filtered,
      totalCount: payments.length,
      filteredCount: filtered.length,
      summary: {
        totalPaid,
        successfulCount,
        failedCount,
        refundCount,
      },
    });
  } catch (error: any) {
    console.error("GET /api/user/payments error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch user payments ledger", payments: [] },
      { status: 500 }
    );
  }
}
