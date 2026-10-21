import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";
import { verifyRazorpaySignature, getRazorpayCredentials } from "@/lib/razorpay";
import { getCitizenIdentity } from "@/lib/auth-helpers";
import { recordPaymentSuccess } from "@/lib/payment-attempt-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      serviceType,
      serviceId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      applicantName,
      applicantPhone,
      formData,
      documents,
    } = body;

    if (!serviceType || !serviceId || !razorpayOrderId) {
      return NextResponse.json(
        { ok: false, error: "Missing required verification fields" },
        { status: 400 }
      );
    }

    // Resolve authenticated customer identity
    let authenticatedCustomerId: number | null = null;
    let verifiedPhone = applicantPhone || "";
    try {
      const nextReq = new NextRequest(request.url, { headers: request.headers });
      const citizen = await getCitizenIdentity(nextReq);
      if (citizen?.customerId) {
        authenticatedCustomerId = citizen.customerId;
      }
      if (citizen?.phone) {
        verifiedPhone = citizen.phone;
      }
    } catch {}

    if (!authenticatedCustomerId) {
      return NextResponse.json({ ok: false, error: "Please sign in to apply." }, { status: 401 });
    }
    const accountRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT verification_status FROM customers WHERE id = ? LIMIT 1`, authenticatedCustomerId
    );
    if (String(accountRows?.[0]?.verification_status || "").toLowerCase() !== "approved") {
      return NextResponse.json({ ok: false, error: "Your account must be verified by staff before applying for services." }, { status: 403 });
    }

    const isFree = String(razorpayOrderId).startsWith("free_");

    // Cryptographic signature verification for paid orders
    if (!isFree) {
      if (!razorpayPaymentId || !razorpaySignature) {
        return NextResponse.json(
          { ok: false, error: "Payment ID and Razorpay signature are mandatory to confirm paid service." },
          { status: 400 }
        );
      }
      const creds = getRazorpayCredentials();
      if (!creds?.keySecret) {
        return NextResponse.json(
          { ok: false, error: "Payment gateway credentials are not configured on server." },
          { status: 503 }
        );
      }
      const isValidSig = verifyRazorpaySignature(
        creds.keySecret,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      );
      if (!isValidSig) {
        return NextResponse.json(
          { ok: false, error: "Payment verification failed: invalid cryptographic signature." },
          { status: 400 }
        );
      }
    }

    const payId = isFree ? `free_${Date.now()}` : razorpayPaymentId;

    // 1. Check Idempotency: Has this order already been verified?
    const existingLog = await prisma.$queryRawUnsafe<any[]>(
      "SELECT * FROM paymentlog WHERE orderId = ? AND status = 'SUCCESS' LIMIT 1",
      razorpayOrderId
    ).catch(() => []);

    if (existingLog && existingLog.length > 0) {
      // Find matching application
      if (serviceType === "DOCUMENT_SERVICE") {
        const existingSr = await prisma.$queryRawUnsafe<any[]>(
          "SELECT id, purchase_notes FROM service_requests WHERE gateway_order_id = ? LIMIT 1",
          razorpayOrderId
        ).catch(() => []);
        if (existingSr && existingSr.length > 0) {
          const s = existingSr[0];
          let receiptNo = `TN-RCP-DOC-${String(s.id).padStart(6, "0")}`;
          try {
            const parsed = JSON.parse(s.purchase_notes || "{}");
            if (parsed.receiptNo) receiptNo = parsed.receiptNo;
          } catch {}
          return NextResponse.json({
            ok: true,
            alreadyProcessed: true,
            applicationId: `TN-DOC-2026-${String(s.id).padStart(6, "0")}`,
            receiptNo,
            status: "confirmed",
          });
        }
      } else {
        const existingEs = await prisma.$queryRawUnsafe<any[]>(
          "SELECT id, application_number, submitted_data FROM es_service_requests WHERE razorpay_order_id = ? LIMIT 1",
          razorpayOrderId
        ).catch(() => []);
        if (existingEs && existingEs.length > 0) {
          const es = existingEs[0];
          let receiptNo = `TN-RCP-ES-${String(es.id).padStart(6, "0")}`;
          try {
            const data = typeof es.submitted_data === "string" ? JSON.parse(es.submitted_data) : es.submitted_data;
            if (data?._receiptNo) receiptNo = data._receiptNo;
          } catch {}
          return NextResponse.json({
            ok: true,
            alreadyProcessed: true,
            applicationId: es.application_number || `TN-ES-2026-${es.id}`,
            receiptNo,
            status: "accepted",
          });
        }
      }
    }

    // 2. Process based on service type
    if (serviceType === "DOCUMENT_SERVICE") {
      // Fetch authoritative fee
      const svc = await prisma.$queryRawUnsafe<any[]>(
        "SELECT id, name, payment_amount FROM services WHERE id = ? LIMIT 1",
        Number(serviceId)
      ).catch(() => []);
      let fee = Number(svc?.[0]?.payment_amount || 0);

      if (!svc || svc.length === 0) {
        return NextResponse.json(
          { ok: false, error: "Document service not found in registry" },
          { status: 404 }
        );
      }

      // Insert service request
      const districtIdVal = body.districtId ? Number(body.districtId) : null;
      const talukIdVal = body.talukId ? Number(body.talukId) : null;
      const panchayatIdVal = body.panchayatId ? Number(body.panchayatId) : null;

      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const appRef = `TN-DOC-2026-${randomSuffix}`;
      const receiptNo = `TN-RCP-DOC-${randomSuffix}`;

      const notesPayload = JSON.stringify({
        receiptNo,
        appRef,
        applicantName: applicantName || "Verified Citizen",
        applicantPhone: verifiedPhone || applicantPhone || "",
        applicantEmail: body.applicantEmail || "",
        district: body.district || "",
        districtId: districtIdVal,
        taluk: body.taluk || "",
        talukId: talukIdVal,
        panchayat: body.panchayat || "",
        panchayatId: panchayatIdVal,
        address: body.address || "",
        pincode: body.pincode || "",
        verifiedAt: new Date().toISOString(),
      });

      // Insert service request
      await prisma.$executeRawUnsafe(
        `INSERT INTO service_requests (
          user_id, customer_id, service_id, amount, status,
          payment_date, confirmed_date, download_count,
          gateway_provider, gateway_order_id, gateway_payment_id, gateway_signature, payment_method,
          district_id, taluk_id, panchayat_id,
          purchase_notes, created_at
        ) VALUES (
          ?, ?, ?, ?, 'confirmed',
          NOW(), NOW(), 0,
          'RAZORPAY', ?, ?,
          ?,
          'UPI',
          ?,
          ?,
          ?,
          ?,
          NOW()
        )`,
        authenticatedCustomerId,
        authenticatedCustomerId,
        Number(serviceId),
        fee,
        razorpayOrderId,
        payId,
        razorpaySignature || null,
        districtIdVal,
        talukIdVal,
        panchayatIdVal,
        notesPayload
      );

      // Retrieve inserted ID
      const lastInserted = await prisma.$queryRawUnsafe<any[]>(
        "SELECT id FROM service_requests WHERE gateway_order_id = ? ORDER BY id DESC LIMIT 1",
        razorpayOrderId
      );
      const insertedId = lastInserted?.[0]?.id || randomSuffix;

      // Update paymentlog
      await prisma.$executeRawUnsafe(
        `UPDATE paymentlog 
         SET status = 'SUCCESS', paymentId = ?, signature = ? 
         WHERE orderId = ?`,
        payId,
        razorpaySignature || null,
        razorpayOrderId
      ).catch(() => {});

      await recordPaymentSuccess({
        razorpayOrderId,
        razorpayPaymentId: payId,
        razorpaySignature,
        applicationReference: appRef,
        receiptNo,
        paymentMethod: "UPI",
      }).catch((err) => console.warn("[recordPaymentSuccess warning]:", err));


      // Trigger In-App Notification and Multichannel Dispatch (Email Receipt + SMS)
      try {
        const { createInAppNotification } = await import("@/lib/notifications");
        await createInAppNotification({
          userId: "1",
          templateKey: "SERVICE_CONFIRMED",
          title: "Application Remitted Successfully",
          body: `Payment of ₹${fee.toFixed(2)} confirmed for ${svc[0]?.name || "Statutory Document Scheme"} (${appRef}). Download template PDF to complete submission.`,
          link: "/user/applications",
          metadata: { applicationId: `DOC-${insertedId}`, appRef, receiptNo },
        });

        // Generate PDF receipt buffer
        let receiptPdfBuffer: Buffer | undefined;
        try {
          const { generateReceiptPdf } = await import("@/lib/generateReceiptPdf");
          const pdfBytes = await generateReceiptPdf({
            receiptNo,
            paymentReference: payId,
            applicationReference: appRef,
            serviceType: "DOCUMENT_SERVICE",
            categoryName: "Statutory Scheme",
            serviceName: svc[0]?.name || "Document Service",
            customerName: applicantName || "Verified Citizen",
            customerPhone: applicantPhone,
            customerEmail: body.applicantEmail,
            amount: fee,
            currency: "INR",
            paymentProvider: "RAZORPAY",
            paymentMethod: "UPI",
            razorpayOrderId,
            razorpayPaymentId: payId,
            paymentStatus: "SUCCESS",
            paymentDate: new Date().toISOString(),
          });
          receiptPdfBuffer = Buffer.from(pdfBytes);
        } catch (pdfErr) {
          console.warn("[Receipt PDF Generation Warning]:", pdfErr);
        }

        // Dispatch Payment Success Notification (Receipt Email with PDF + Short SMS)
        const { dispatchPaymentSuccessNotification } = await import("@/lib/notification-service");
        await dispatchPaymentSuccessNotification({
          userId: String(body.userId || "1"),
          name: applicantName || "Verified Citizen",
          email: body.applicantEmail,
          phone: applicantPhone,
          serviceName: svc[0]?.name || "Document Service",
          applicationRef: appRef,
          receiptNo,
          amount: fee,
          paymentId: payId,
          serviceType: "DOCUMENT_SERVICE",
          pdfBuffer: receiptPdfBuffer,
        });

        // Trigger Modular In-App Notification with idempotency
        const { NotificationTriggerService } = await import("@/modules/notifications/services/notification-trigger.service");
        await NotificationTriggerService.triggerServicePaymentSuccess({
          userId: String(body.userId || "1"),
          orderId: razorpayOrderId,
          paymentId: payId,
          amount: fee,
          serviceName: svc[0]?.name || "Document Service",
          applicationId: appRef,
          email: body.applicantEmail,
          phone: applicantPhone,
        });
      } catch (notifErr) {
        console.warn("[Payment Notification Warning]:", notifErr);
      }

      return NextResponse.json({
        ok: true,
        applicationId: appRef,
        receiptNo,
        status: "confirmed",
        serviceType: "DOCUMENT_SERVICE",
        amount: fee,
      });
    } else if (serviceType === "E_SERVICE") {
      // Fetch authoritative fee
      const es = await prisma.$queryRawUnsafe<any[]>(
        "SELECT id, service_name, service_cost FROM es_services WHERE id = ? LIMIT 1",
        Number(serviceId)
      ).catch(() => []);
      const fee = Number(es?.[0]?.service_cost || 0);

      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const appRef = `TN-ES-2026-${randomSuffix}`;
      const receiptNo = `TN-RCP-ES-${randomSuffix}`;

      const payloadData = {
        ...(typeof formData === "object" ? formData : {}),
        district: body.district || formData?.district || "",
        taluk: body.taluk || formData?.taluk || "",
        panchayat: body.panchayat || formData?.panchayat || "",
        address: body.address || formData?.address || "",
        pincode: body.pincode || formData?.pincode || "",
        _receiptNo: receiptNo,
        _applicantName: applicantName || formData?.applicantName || "Verified Citizen",
        _applicantPhone: verifiedPhone || applicantPhone || formData?.applicantPhone || "",
        _verifiedAt: new Date().toISOString(),
      };

      const payloadFiles = typeof documents === "object" ? documents : {};

      await prisma.$executeRawUnsafe(
        `INSERT INTO es_service_requests (
          application_number, user_id, service_id, creator_type,
          submitted_data, submitted_files, amount,
          payment_status, razorpay_order_id, razorpay_payment_id,
          status, admin_remark, created_at, updated_at
        ) VALUES (
          ?, ?, ?, 'user',
          ?,
          ?,
          ?,
          'Success', ?, ?,
          'accepted', 'Verified via Razorpay Payment Gateway', NOW(), NOW()
        )`,
        appRef,
        authenticatedCustomerId,
        Number(serviceId),
        JSON.stringify(payloadData),
        JSON.stringify(payloadFiles),
        fee,
        razorpayOrderId,
        payId
      );

      // Update paymentlog
      await prisma.$executeRawUnsafe(
        `UPDATE paymentlog 
         SET status = 'SUCCESS', paymentId = ?, signature = ? 
         WHERE orderId = ?`,
        payId,
        razorpaySignature || null,
        razorpayOrderId
      ).catch(() => {});

      await recordPaymentSuccess({
        razorpayOrderId,
        razorpayPaymentId: payId,
        razorpaySignature,
        applicationReference: appRef,
        receiptNo,
        paymentMethod: "UPI",
      }).catch((err) => console.warn("[recordPaymentSuccess warning]:", err));

      // Trigger In-App Notification
      try {
        const { createInAppNotification } = await import("@/lib/notifications");
        await createInAppNotification({
          userId: String(authenticatedCustomerId),
          templateKey: "APPLICATION_APPROVED",
          title: "Online Application Accepted",
          body: `Payment of ₹${fee.toFixed(2)} received for "${es?.[0]?.service_name || "Online Application"}" (${appRef}). Application is under review.`,
          link: "/user/applications",
          metadata: { appRef, receiptNo },
        });
      } catch {}


      // Generate Receipt PDF and Send Notifications (Email + SMS)
      try {
        let receiptPdfBuffer: Buffer | undefined = undefined;
        try {
          const { generateReceiptPdf } = await import("@/lib/generateReceiptPdf");
          const pdfBytes = await generateReceiptPdf({
            receiptNo,
            paymentReference: payId,
            applicationReference: appRef,
            serviceType: "E_SERVICE",
            categoryName: "Online E-Service",
            serviceName: es?.[0]?.service_name || "E-Service",
            customerName: applicantName || formData?.applicantName || "Verified Citizen",
            customerPhone: applicantPhone || formData?.applicantPhone || "",
            customerEmail: body.applicantEmail || formData?.applicantEmail,
            amount: fee,
            currency: "INR",
            paymentProvider: "RAZORPAY",
            paymentMethod: "UPI",
            razorpayOrderId,
            razorpayPaymentId: payId,
            paymentStatus: "SUCCESS",
            paymentDate: new Date().toISOString(),
          });
          receiptPdfBuffer = Buffer.from(pdfBytes);
        } catch (pdfErr) {
          console.warn("[Receipt PDF Generation Warning]:", pdfErr);
        }

        // Dispatch Payment Success Notification (Receipt Email with PDF + Short SMS)
        const { dispatchPaymentSuccessNotification } = await import("@/lib/notification-service");
        await dispatchPaymentSuccessNotification({
          userId: String(body.userId || "1"),
          name: applicantName || formData?.applicantName || "Verified Citizen",
          email: body.applicantEmail || formData?.applicantEmail,
          phone: applicantPhone || formData?.applicantPhone,
          serviceName: es?.[0]?.service_name || "E-Service",
          applicationRef: appRef,
          receiptNo,
          amount: fee,
          paymentId: payId,
          serviceType: "E_SERVICE",
          pdfBuffer: receiptPdfBuffer,
        });

        // Trigger Modular In-App Notification with idempotency
        const { NotificationTriggerService } = await import("@/modules/notifications/services/notification-trigger.service");
        await NotificationTriggerService.triggerEServicePaymentSuccess({
          userId: String(body.userId || "1"),
          applicationId: appRef,
          applicationNumber: appRef,
          receiptNo,
          amount: fee,
          paymentId: payId,
          email: body.applicantEmail || formData?.applicantEmail,
          phone: applicantPhone || formData?.applicantPhone,
        });
      } catch (notifErr) {
        console.warn("[Payment Notification Warning]:", notifErr);
      }

      return NextResponse.json({
        ok: true,
        applicationId: appRef,
        receiptNo,
        status: "accepted",
        serviceType: "E_SERVICE",
        amount: fee,
      });
    }

    return NextResponse.json({ ok: false, error: "Invalid service type" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/payments/razorpay/verify error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Payment verification failed" },
      { status: 500 }
    );
  }
}
