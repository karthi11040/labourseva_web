import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedActor } from "@/lib/staff-session";
import { signDocumentWithDistrict } from "@/lib/district-signer";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getCustomerDocumentDigest } from "@/lib/verification/customer-document-digest";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const actor = getAuthenticatedActor(request);

  // Strict Server-Side Access Control: Super Admin or Employee only
  if (actor.role !== "ADMIN" && actor.role !== "EMPLOYEE") {
    return NextResponse.json(
      { ok: false, error: "Access denied. Only Super Administrators and Employees can review verification requests." },
      { status: 403 }
    );
  }

  if (actor.role === "EMPLOYEE" && actor.canVerify === false) {
    return NextResponse.json(
      { ok: false, error: "Access denied. Your employee account does not have verification permissions." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const userType = String(body.userType || "").toLowerCase();
    const userId = Number(body.userId);
    const action = String(body.action || "").toUpperCase(); // 'APPROVE' | 'REJECT' | 'REQUEST_DOCS'
    const notes = String(body.notes || "").trim();

    // A reviewer examination is valid for at most five minutes. The signed
    // token binds reviewer, case and current uploaded document hashes.
    const examinationToken = String(body.examinationToken || "");
    const tokenParts = examinationToken.split(".");
    if (tokenParts.length !== 3 || !/^\d+$/.test(tokenParts[0])) {
      return NextResponse.json({ ok: false, error: "Examine the documents before recording a decision." }, { status: 428 });
    }
    const [issuedAtRaw, providedSignature] = tokenParts;
    const issuedAt = Number(issuedAtRaw);
    const maxExaminationAgeMs = 5 * 60 * 1000;
    if (!Number.isSafeInteger(issuedAt) || Date.now() < issuedAt || Date.now() - issuedAt > maxExaminationAgeMs) {
      return NextResponse.json({ ok: false, error: "The document examination expired. Please review the documents again." }, { status: 428 });
    }
    const reviewSecret = process.env.STAFF_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "secure-labourseva-verification-review-2026";

    if (!["customer", "guest", "retailer", "distributor", "user", "service_request", "service"].includes(userType)) {
      return NextResponse.json(
        { ok: false, error: "Invalid user type." },
        { status: 400 }
      );
    }

    if (!userId || isNaN(userId)) {
      return NextResponse.json(
        { ok: false, error: "A valid user ID is required." },
        { status: 400 }
      );
    }

    if (userType === "customer" || userType === "retailer") {
      const { digest: documentDigest } = await getCustomerDocumentDigest(userId, userType === "retailer" ? "retailer" : "customer");
      const documentTokenSignature = tokenParts.length === 3 ? tokenParts[2] : "";
      const expectedSignature = createHmac("sha256", reviewSecret).update(`${issuedAt}:${actor.role}:${actor.id}:${userType}:${userId}:${action}:${documentDigest}`).digest("hex");
      const documentTokenBytes = Buffer.from(providedSignature);
      const expectedDocumentBytes = Buffer.from(expectedSignature);
      if (documentTokenBytes.length !== expectedDocumentBytes.length || !timingSafeEqual(documentTokenBytes, expectedDocumentBytes) || documentTokenSignature !== documentDigest) {
        return NextResponse.json({ ok: false, error: "The uploaded documents changed after examination. Review the current documents again." }, { status: 428 });
      }
    } else {
      const expectedSignature = createHmac("sha256", reviewSecret).update(`${issuedAt}:${actor.role}:${actor.id}:${userType}:${userId}:${action}:none`).digest("hex");
      const expectedBytes = Buffer.from(expectedSignature);
      const providedBytes = Buffer.from(providedSignature);
      if (providedBytes.length !== expectedBytes.length || !timingSafeEqual(providedBytes, expectedBytes) || tokenParts[2] !== "none") {
        return NextResponse.json({ ok: false, error: "The examination token is invalid. Review the case again." }, { status: 428 });
      }
    }

    if (!["APPROVE", "REJECT", "REQUEST_DOCS"].includes(action)) {
      return NextResponse.json(
        { ok: false, error: "Invalid review action. Allowed actions: APPROVE, REJECT, REQUEST_DOCS." },
        { status: 400 }
      );
    }

    if ((action === "REJECT" || action === "REQUEST_DOCS") && !notes) {
      return NextResponse.json(
        { ok: false, error: "A decision note or explanation is required when rejecting or requesting additional documents." },
        { status: 400 }
      );
    }

    let newStatus = "Pending";
    let actionPerformed = "";

    if (action === "APPROVE") {
      newStatus = "Approved";
      actionPerformed = "verify_approve";
    } else if (action === "REJECT") {
      newStatus = "Rejected";
      actionPerformed = "verify_reject";
    } else if (action === "REQUEST_DOCS") {
      newStatus = "Re-Upload Required";
      actionPerformed = "request_additional_documents";
    }

    let oldStatus = "Pending";
    let applicantName = "";
    let applicantEmail = "";
    let applicantPhone = "";
    let serviceName = "";
    let appRef = "";
    let notificationDelivery: { inAppSaved?: boolean; emailSent?: boolean; smsSent?: boolean; errors?: string[] } | null = null;

    // 1. Update respective table
    if (userType === "customer") {
      const [existing] = await prisma.$queryRawUnsafe<any[]>(
        `SELECT full_name as name, email, phone, verification_status FROM customers WHERE id = ? LIMIT 1`,
        userId
      );
      oldStatus = existing?.verification_status || "Pending";
      applicantName = existing?.name || "Citizen Beneficiary";
      applicantEmail = existing?.email || "";
      applicantPhone = existing?.phone || "";

      await prisma.$executeRawUnsafe(
        `UPDATE customers
         SET verification_status = ?,
             status = CASE WHEN ? = 'Approved' THEN 'active' ELSE status END,
             verification_note = ?,
             rejection_reason = ?
         WHERE id = ?`,
        newStatus,
        newStatus,
        notes || (action === "APPROVE" ? "Approved by staff" : ""),
        action === "REJECT" ? notes : null,
        userId
      );
      const [updatedCustomer] = await prisma.$queryRawUnsafe<any[]>(
        `SELECT verification_status, status FROM customers WHERE id = ? LIMIT 1`,
        userId
      );
      if (!updatedCustomer) {
        return NextResponse.json({ ok: false, error: "Customer account was not found; no verification decision was saved." }, { status: 404 });
      }
      if (action === "APPROVE" && String(updatedCustomer.verification_status || "").toLowerCase() !== "approved") {
        return NextResponse.json({ ok: false, error: "The account status did not update to Approved. No approval notification was sent." }, { status: 500 });
      }
    } else if (userType === "guest") {
      const [existing] = await prisma.$queryRawUnsafe<any[]>(
        `SELECT name, email, phone, verification_status FROM guests WHERE id = ? LIMIT 1`,
        userId
      );
      oldStatus = existing?.verification_status || "Pending";
      applicantName = existing?.name || "Citizen Guest";
      applicantEmail = existing?.email || "";
      applicantPhone = existing?.phone || "";

      const reviewerNumericId = typeof actor.id === "number" ? actor.id : 1;

      await prisma.$executeRawUnsafe(
        `UPDATE guests
         SET verification_status = ?,
             rejection_reason = ?,
             reviewer_id = ?
         WHERE id = ?`,
        newStatus,
        action === "REJECT" || action === "REQUEST_DOCS" ? notes : null,
        reviewerNumericId,
        userId
      );
    } else if (userType === "retailer") {
      const [existing] = await prisma.$queryRawUnsafe<any[]>(
        `SELECT name, email, phone, status, is_approved FROM retail_users WHERE id = ? LIMIT 1`,
        userId
      );
      oldStatus = existing?.status || "Pending";
      applicantName = existing?.name || "Retailer Partner";
      applicantEmail = existing?.email || "";
      applicantPhone = existing?.phone || "";

      await prisma.$executeRawUnsafe(
        `UPDATE retail_users
         SET status = ?, is_approved = ?,
             rejection_reason = ?,
             verification_note = ?
         WHERE id = ?`,
        newStatus,
        action === "APPROVE" ? 1 : 0,
        action === "REJECT" ? notes : null,
        notes,
        userId
      );
      const [updatedRetailer] = await prisma.$queryRawUnsafe<any[]>(
        `SELECT status, is_approved FROM retail_users WHERE id = ? LIMIT 1`,
        userId
      );
      if (!updatedRetailer || (action === "APPROVE" && (String(updatedRetailer.status || "").toLowerCase() !== "approved" || Number(updatedRetailer.is_approved) !== 1))) {
        return NextResponse.json({ ok: false, error: "The retailer account was not approved in storage. No approval notification was sent." }, { status: 500 });
      }

      // Also sync retailers table if row exists
      try {
        const retailerStatus = action === "APPROVE" ? "active" : action === "REJECT" ? "inactive" : "pending";
        await prisma.$executeRawUnsafe(
          `UPDATE retailers SET status = ? WHERE id = ?`,
          retailerStatus,
          userId
        );
      } catch {}
    } else if (userType === "distributor") {
      const [existing] = await prisma.$queryRawUnsafe<any[]>(
        `SELECT name, email, phone, verification_status, is_approved FROM distributors WHERE id = ? LIMIT 1`,
        userId
      );
      oldStatus = existing?.verification_status || (existing?.is_approved ? "Approved" : "Pending");
      applicantName = existing?.name || "Distributor Partner";
      applicantEmail = existing?.email || "";
      applicantPhone = existing?.phone || "";

      const isApproved = action === "APPROVE" ? 1 : 0;
      await prisma.$executeRawUnsafe(
        `UPDATE distributors
         SET verification_status = ?,
             is_approved = ?,
             rejection_reason = ?
         WHERE id = ?`,
        newStatus,
        isApproved,
        action === "REJECT" || action === "REQUEST_DOCS" ? notes : null,
        userId
      );
    } else if (userType === "user") {
      const [existing] = await prisma.$queryRawUnsafe<any[]>(
        `SELECT full_name as name, email, phone, status, is_approved FROM users WHERE id = ? LIMIT 1`,
        userId
      );
      oldStatus = existing?.is_approved ? "Approved" : "Pending";
      applicantName = existing?.name || "Citizen User";
      applicantEmail = existing?.email || "";
      applicantPhone = existing?.phone || "";

      const userStatus = action === "APPROVE" ? "active" : action === "REJECT" ? "suspended" : "pending";
      const isApproved = action === "APPROVE" ? 1 : 0;
      await prisma.$executeRawUnsafe(
        `UPDATE users SET status = ?, is_approved = ? WHERE id = ?`,
        userStatus,
        isApproved,
        userId
      );
    } else if (userType === "service_request" || userType === "service") {
      const [existing] = await prisma.$queryRawUnsafe<any[]>(
        `SELECT sr.*, s.name as service_name 
         FROM service_requests sr 
         LEFT JOIN services s ON sr.service_id = s.id 
         WHERE sr.id = ? LIMIT 1`,
        userId
      );
      oldStatus = existing?.status || "Pending";
      serviceName = existing?.service_name || "Document Statutory Service";

      let pNotes: Record<string, any> = {};
      try {
        pNotes = typeof existing?.purchase_notes === "string" ? JSON.parse(existing.purchase_notes) : (existing?.purchase_notes || {});
      } catch {
        pNotes = {};
      }
      appRef = pNotes.appRef || `DOC-${userId}`;
      applicantName = pNotes.applicantName || "";
      applicantEmail = pNotes.applicantEmail || "";
      applicantPhone = pNotes.applicantPhone || "";

      if (!applicantEmail && existing?.customer_id) {
        const [c] = await prisma.$queryRawUnsafe<any[]>(`SELECT full_name as name, email, phone FROM customers WHERE id = ? LIMIT 1`, existing.customer_id).catch(() => []);
        if (c) {
          applicantName = applicantName || c.name;
          applicantEmail = c.email;
          applicantPhone = applicantPhone || c.phone;
        }
      }
      if (!applicantEmail && existing?.guest_id) {
        const [g] = await prisma.$queryRawUnsafe<any[]>(`SELECT name, email, phone FROM guests WHERE id = ? LIMIT 1`, existing.guest_id).catch(() => []);
        if (g) {
          applicantName = applicantName || g.name;
          applicantEmail = g.email;
          applicantPhone = applicantPhone || g.phone;
        }
      }

      if (action === "APPROVE") {
        newStatus = "Approved";
        await signDocumentWithDistrict(userId);
        await prisma.$queryRawUnsafe(
          `UPDATE service_requests SET status = 'approved', rejection_reason = ?, signed_at = NOW() WHERE id = ?`,
          notes || null,
          userId
        );
      } else if (action === "REQUEST_DOCS") {
        newStatus = "Re-Upload Required";
        await prisma.$queryRawUnsafe(
          `UPDATE service_requests SET status = 'returned', rejection_reason = ?, updated_at = NOW() WHERE id = ?`,
          notes || "Document resubmission requested by verification desk.",
          userId
        );
        try {
          const { createInAppNotification } = await import("@/lib/notifications");
          await createInAppNotification({
            userId: "1",
            templateKey: "REUPLOAD_REQUESTED",
            title: "Action Required: Re-upload Document",
            body: `Service request DOC-${userId} was returned: ${notes || "Please re-upload your document."}`,
            link: "/user/applications",
            metadata: { applicationId: `DOC-${userId}`, reason: notes },
          });
        } catch {}
      } else if (action === "REJECT") {
        newStatus = "Rejected";
        if (existing?.gateway_payment_id) {
          const { refundRejectedApplication } = await import("@/lib/application-refund");
          await refundRejectedApplication({
            paymentId: existing.gateway_payment_id,
            orderId: existing.gateway_order_id,
            amountRupees: Number(existing.amount || 0),
            applicationReference: appRef,
          });
        } else if (String(existing?.gateway_provider || "").toUpperCase() === "KENDRA_WALLET" && pNotes.assistedKendraId) {
          const { refundRetailerWallet } = await import("@/lib/application-refund");
          await refundRetailerWallet({ retailerId: pNotes.assistedKendraId, amountRupees: Number(existing.amount || 0), applicationReference: appRef });
        }
        await prisma.$queryRawUnsafe(
          `UPDATE service_requests SET status = 'rejected', rejection_reason = ?, updated_at = NOW() WHERE id = ?`,
          notes || "Application rejected by verification desk.",
          userId
        );
        try {
          const { createInAppNotification } = await import("@/lib/notifications");
          await createInAppNotification({
            userId: "1",
            templateKey: "APPLICATION_REJECTED",
            title: "Application Status Update",
            body: `Service request DOC-${userId} was rejected: ${notes || "Does not meet criteria."}`,
            link: "/user/applications",
            metadata: { applicationId: `DOC-${userId}`, reason: notes },
          });
        } catch {}
      }
    }

    // 2. Audit Trail Record in kyc_audit_logs
    const reviewerIdForAudit = typeof actor.id === "number" ? actor.id : 1;
    await prisma.$executeRawUnsafe(
      `INSERT INTO kyc_audit_logs (user_type, user_id, admin_id, action_performed, old_status, new_status, notes, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, '127.0.0.1', NOW())`,
      userType,
      userId,
      reviewerIdForAudit,
      actionPerformed,
      oldStatus,
      newStatus,
      notes || `Marked as ${newStatus} by ${actor.name} (${actor.role})`
    );

    // 3. If Employee, log into employee_logs
    if (actor.role === "EMPLOYEE" && typeof actor.id === "number") {
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO employee_logs (employee_id, action, description, created_at)
           VALUES (?, ?, ?, NOW())`,
          actor.id,
          actionPerformed.toUpperCase(),
          `Reviewed ${userType} #${userId}: ${newStatus}. Note: ${notes || "None"}`
        );
      } catch {}
    }

    // 4. Dispatch Notifications based on Action and UserType
    try {
      if (["customer", "guest", "retailer", "distributor", "user"].includes(userType)) {
        if (action === "APPROVE") {
          const { NotificationTriggerService } = await import("@/modules/notifications/services/notification-trigger.service");
          notificationDelivery = await NotificationTriggerService.triggerAccountApproved({
            userId: String(userId),
            name: applicantName || "Citizen Beneficiary",
            email: applicantEmail,
            phone: applicantPhone,
          });
        } else if (action === "REJECT") {
          const { dispatchAccountRejectedNotification } = await import("@/lib/notification-service");
          await dispatchAccountRejectedNotification({
            userId,
            name: applicantName || "Citizen Beneficiary",
            email: applicantEmail,
            userType: userType.toUpperCase(),
            reason: notes || "Verification requirements not met.",
          });

          // Idempotent In-App Modular Trigger
          const { NotificationTriggerService } = await import("@/modules/notifications/services/notification-trigger.service");
          await NotificationTriggerService.triggerAccountRejected({
            userId: String(userId),
            name: applicantName || "Citizen Beneficiary",
            reason: notes || "Verification requirements not met.",
            email: applicantEmail,
            phone: applicantPhone,
          });
        } else if (action === "REQUEST_DOCS") {
          const { dispatchAdditionalInfoRequestedNotification } = await import("@/lib/notification-service");
          await dispatchAdditionalInfoRequestedNotification({
            userId,
            name: applicantName || "Citizen Beneficiary",
            email: applicantEmail,
            userType: userType.toUpperCase(),
            requestedInfo: notes || "Please re-upload your verification documents with clear, valid certificates.",
          });

          // Idempotent In-App Modular Trigger
          const { NotificationTriggerService } = await import("@/modules/notifications/services/notification-trigger.service");
          await NotificationTriggerService.triggerAdditionalInfoRequested({
            userId: String(userId),
            applicationId: `ACC-${userId}`,
            notes: notes || "Please re-upload your verification documents with clear, valid certificates.",
            email: applicantEmail,
            phone: applicantPhone,
          });
        }
      } else if (userType === "service_request" || userType === "service") {
        if (action === "APPROVE") {
          const { dispatchServiceApplicationApprovedNotification, dispatchSignedDocumentReadyNotification } = await import("@/lib/notification-service");
          // 1. Approval email (WITHOUT OTP)
          await dispatchServiceApplicationApprovedNotification({
            userId,
            name: applicantName || "Applicant",
            email: applicantEmail,
            serviceName: serviceName || "Document Service",
            applicationRef: appRef || `DOC-${userId}`,
            serviceType: "DOCUMENT_SERVICE",
          });
          // 2. Signed document ready email
          await dispatchSignedDocumentReadyNotification({
            userId,
            name: applicantName || "Applicant",
            email: applicantEmail,
            serviceName: serviceName || "Document Service",
            applicationRef: appRef || `DOC-${userId}`,
          });

          // Idempotent In-App Modular Triggers
          const { NotificationTriggerService } = await import("@/modules/notifications/services/notification-trigger.service");
          await NotificationTriggerService.triggerApplicationApproved({
            userId: String(userId),
            applicationId: `DOC-${userId}`,
            applicationNumber: appRef || `DOC-${userId}`,
            serviceName: serviceName || "Document Service",
            type: "DOCUMENT_SERVICE",
            email: applicantEmail,
          });
          await NotificationTriggerService.triggerSignedDocumentReady({
            userId: String(userId),
            applicationId: `DOC-${userId}`,
            applicationNumber: appRef || `DOC-${userId}`,
            serviceName: serviceName || "Document Service",
            signedPdfPath: `/api/admin/service-signing?id=${userId}&download=true`,
            email: applicantEmail,
          });
        } else if (action === "REJECT") {
          const { dispatchApplicationRejectedNotification } = await import("@/lib/notification-service");
          await dispatchApplicationRejectedNotification({
            userId,
            name: applicantName || "Applicant",
            email: applicantEmail,
            serviceName: serviceName || "Document Service",
            applicationRef: appRef || `DOC-${userId}`,
            reason: notes || "Application rejected by verification desk.",
          });

          // Idempotent In-App Modular Trigger
          const { NotificationTriggerService } = await import("@/modules/notifications/services/notification-trigger.service");
          await NotificationTriggerService.triggerApplicationRejected({
            userId: String(userId),
            applicationId: `DOC-${userId}`,
            applicationNumber: appRef || `DOC-${userId}`,
            serviceName: serviceName || "Document Service",
            reason: notes || "Application rejected by verification desk.",
            type: "DOCUMENT_SERVICE",
            email: applicantEmail,
          });
        } else if (action === "REQUEST_DOCS") {
          const { dispatchApplicationInformationRequestedNotification } = await import("@/lib/notification-service");
          await dispatchApplicationInformationRequestedNotification({
            userId,
            name: applicantName || "Applicant",
            email: applicantEmail,
            serviceName: serviceName || "Document Service",
            applicationRef: appRef || `DOC-${userId}`,
            instructions: notes || "Please re-upload your document as requested by verification desk.",
          });

          // Idempotent In-App Modular Trigger
          const { NotificationTriggerService } = await import("@/modules/notifications/services/notification-trigger.service");
          await NotificationTriggerService.triggerAdditionalInfoRequested({
            userId: String(userId),
            applicationId: `DOC-${userId}`,
            applicationNumber: appRef || `DOC-${userId}`,
            notes: notes || "Please re-upload your document as requested by verification desk.",
            email: applicantEmail,
          });
        }
      }
    } catch (notifErr) {
      console.warn("[Verification Notification Warning]:", notifErr);
      notificationDelivery = { inAppSaved: false, emailSent: false, smsSent: false, errors: [notifErr instanceof Error ? notifErr.message : "Notification delivery failed."] };
    }

    return NextResponse.json({
      ok: true,
      message: `Verification request for ${userType} #${userId} updated to ${newStatus}.`,
      userType,
      userId,
      oldStatus,
      newStatus,
      notification: notificationDelivery,
      reviewedBy: {
        id: actor.id,
        name: actor.name,
        role: actor.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to process verification decision." },
      { status: 500 }
    );
  }
}
