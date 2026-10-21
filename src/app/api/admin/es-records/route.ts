import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("service_id");
    const status = searchParams.get("status");
    const creatorType = searchParams.get("creator_type");
    const search = searchParams.get("search");

    const whereClause: any = {};

    if (serviceId && Number(serviceId) > 0) {
      whereClause.serviceId = Number(serviceId);
    }

    if (status) {
      const statusMap: Record<string, string[]> = {
        pending: ["IN_REVIEW", "PAID_PENDING_VERIFICATION", "PENDING_PAYMENT", "DRAFT"],
        accepted: ["APPROVED", "COMPLETED"],
        rejected: ["REJECTED", "CANCELLED"],
        returned: ["RETURNED"],
      };
      if (statusMap[status.toLowerCase()]) {
        whereClause.status = { in: statusMap[status.toLowerCase()] };
      }
    }

    if (creatorType) {
      const typeMap: Record<string, string> = {
        guest: "GUEST",
        customer: "CUSTOMER",
        retailer: "ASSISTED_RETAILER",
        distributor: "DISTRIBUTOR",
      };
      if (typeMap[creatorType.toLowerCase()]) {
        whereClause.applicantType = typeMap[creatorType.toLowerCase()];
      }
    }

    const applications = await prisma.application.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        service: true,
        customer: {
          include: {
            profile: true,
          },
        },
        documents: true,
      },
    });

    const [totalCount, pendingCount, acceptedCount, rejectedCount, returnedCount] = await Promise.all([
      prisma.application.count().catch(() => 0),
      prisma.application
        .count({
          where: { status: { in: ["IN_REVIEW", "PAID_PENDING_VERIFICATION", "PENDING_PAYMENT", "DRAFT"] } },
        })
        .catch(() => 0),
      prisma.application
        .count({
          where: { status: { in: ["APPROVED", "COMPLETED"] } },
        })
        .catch(() => 0),
      prisma.application
        .count({
          where: { status: { in: ["REJECTED", "CANCELLED"] } },
        })
        .catch(() => 0),
      prisma.application
        .count({
          where: { status: "RETURNED" },
        })
        .catch(() => 0),
    ]);

    const formattedRecords = applications.map((app) => {
      let mappedStatus: "pending" | "accepted" | "rejected" | "returned" = "pending";
      if (app.status === "APPROVED" || app.status === "COMPLETED") mappedStatus = "accepted";
      else if (app.status === "REJECTED" || app.status === "CANCELLED") mappedStatus = "rejected";
      else if (app.status === "RETURNED") mappedStatus = "returned";

      let submittedData: any = {};
      try {
        submittedData = JSON.parse(app.formDataEnc || "{}");
      } catch {
        submittedData = {};
      }

      return {
        id: app.id,
        referenceNo: app.referenceNo,
        serviceId: app.serviceId,
        serviceName: app.service.nameEn,
        serviceCost: Number(app.feePaise) / 100,
        applicantName: (submittedData?.applicantName as string) || (submittedData?.name as string) || "Applicant",
        applicantPhone: (submittedData?.phone as string) || (submittedData?.mobile as string) || "N/A",
        creatorType: app.applicantType.toLowerCase(),
        creatorId: app.customerId || app.retailerId || app.distributorId || undefined,
        status: mappedStatus,
        paymentStatus: app.paidAt ? "PAID" : "PENDING",
        adminRemark: app.lastRemarks || "",
        submittedData,
        submittedFiles: (app.documents || []).map((doc) => ({
          name: doc.label || "Document",
          key: doc.documentId,
        })),
        createdAt: app.createdAt.toISOString(),
        updatedAt: app.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({
      ok: true,
      stats: {
        total: totalCount,
        pending: pendingCount,
        accepted: acceptedCount,
        rejected: rejectedCount,
        returned: returnedCount,
      },
      records: formattedRecords,
    });
  } catch {
    return NextResponse.json({
      ok: true,
      stats: { total: 0, pending: 0, accepted: 0, rejected: 0, returned: 0 },
      records: [],
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, status, remark } = body;

    if (!id || !status) {
      return NextResponse.json({ ok: false, error: "ID and status required" }, { status: 400 });
    }

    const prismaStatusMap: Record<string, any> = {
      accepted: "APPROVED",
      rejected: "REJECTED",
      returned: "RETURNED",
      pending: "IN_REVIEW",
    };

    const targetStatus = prismaStatusMap[status.toLowerCase()] || "IN_REVIEW";

    const updated = await prisma.application.update({
      where: { id: String(id) },
      data: {
        status: targetStatus,
        lastRemarks: remark || null,
        returnCount: targetStatus === "RETURNED" ? { increment: 1 } : undefined,
      },
      include: {
        service: true,
        customer: true,
        payments: true,
      },
    });

    if (targetStatus === "REJECTED") {
      const capturedPayment = (updated as any).payments?.find((payment: any) => payment.providerPaymentId && payment.status === "CAPTURED");
      if (capturedPayment) {
        const { refundRejectedApplication } = await import("@/lib/application-refund");
        await refundRejectedApplication({
          paymentId: capturedPayment.providerPaymentId,
          orderId: capturedPayment.providerOrderId,
          amountRupees: Number(capturedPayment.amountPaise) / 100,
          applicationReference: updated.referenceNo,
        });
      }
    }

    // Dispatch E-Service notifications
    try {
      let formDataObj: Record<string, any> = {};
      try {
        formDataObj = JSON.parse(updated.formDataEnc || "{}");
      } catch {
        formDataObj = {};
      }

      const applicantName = (formDataObj.applicantName as string) || (formDataObj.name as string) || (updated.customer as any)?.name || "Applicant";
      const applicantEmail = (formDataObj.email as string) || (updated.customer as any)?.email || "";
      const serviceName = updated.service?.nameEn || "Online E-Service";

      if (targetStatus === "APPROVED") {
        const { dispatchServiceApplicationApprovedNotification } = await import("@/lib/notification-service");
        await dispatchServiceApplicationApprovedNotification({
          userId: updated.customerId || "1",
          name: applicantName,
          email: applicantEmail,
          serviceName,
          applicationRef: updated.referenceNo,
          serviceType: "E_SERVICE",
        });
      } else if (targetStatus === "REJECTED") {
        const { dispatchApplicationRejectedNotification } = await import("@/lib/notification-service");
        await dispatchApplicationRejectedNotification({
          userId: updated.customerId || "1",
          name: applicantName,
          email: applicantEmail,
          serviceName,
          applicationRef: updated.referenceNo,
          reason: remark || "Application does not meet eligibility criteria.",
        });
      } else if (targetStatus === "RETURNED") {
        const { dispatchApplicationInformationRequestedNotification } = await import("@/lib/notification-service");
        await dispatchApplicationInformationRequestedNotification({
          userId: updated.customerId || "1",
          name: applicantName,
          email: applicantEmail,
          serviceName,
          applicationRef: updated.referenceNo,
          instructions: remark || "Additional documentation required by reviewer.",
        });
      }
    } catch (notifErr) {
      console.warn("[ES Records Notification Warning]:", notifErr);
    }

    return NextResponse.json({ ok: true, application: updated });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to update record status" },
      { status: 500 }
    );
  }
}
