import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";
import { getCitizenIdentity } from "@/lib/auth-helpers";
import { createRazorpayOrder, getRazorpayCredentials } from "@/lib/razorpay";

import { recordPaymentInitiation } from "@/lib/payment-attempt-repository";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const me = await getCitizenIdentity(request);
    if (!me) {
      return NextResponse.json({ ok: false, error: "Please sign in to apply." }, { status: 401 });
    }

    const accountRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT verification_status FROM customers WHERE id = ? LIMIT 1`, me.customerId
    );
    if (String(accountRows?.[0]?.verification_status || "").toLowerCase() !== "approved") {
      return NextResponse.json({ ok: false, error: "Complete your profile and wait for staff verification before applying for services." }, { status: 403 });
    }

    const body = await request.json();
    const serviceType = body.serviceType;
    const serviceId = Number(body.serviceId);

    if (!serviceType || !Number.isInteger(serviceId) || serviceId <= 0) {
      return NextResponse.json(
        { ok: false, error: "serviceType and serviceId are required" },
        { status: 400 }
      );
    }

    let fee = 0;
    let serviceName = "";
    let categoryName = "";

    if (serviceType === "DOCUMENT_SERVICE") {
      const svc = await prisma.$queryRawUnsafe<any[]>(
        `SELECT s.id, s.name, s.payment_amount, st.name AS type_name
         FROM services s
         LEFT JOIN service_types st ON s.service_type_id = st.id
         WHERE s.id = ? LIMIT 1`,
        serviceId
      );
      if (svc.length === 0) {
        return NextResponse.json({ ok: false, error: "Document service not found" }, { status: 404 });
      }
      fee = Number(svc[0].payment_amount || 0);
      serviceName = svc[0].name;
      categoryName = svc[0].type_name || "Document Services";
    } else if (serviceType === "E_SERVICE") {
      let ids: number[] = [];
      if (Array.isArray(body.serviceIds) && body.serviceIds.length > 0) {
        ids = body.serviceIds.map(Number).filter((n: number) => !isNaN(n) && n > 0);
      } else if (serviceId > 0) {
        ids = [serviceId];
      }

      if (ids.length === 0) {
        return NextResponse.json({ ok: false, error: "Valid service ID is required" }, { status: 400 });
      }

      const placeholders = ids.map(() => "?").join(",");
      const esList = await prisma.$queryRawUnsafe<any[]>(
        `SELECT s.id, s.service_name, s.service_cost, m.category_name
         FROM es_services s
         LEFT JOIN es_main_categories m ON s.main_category_id = m.id
         WHERE s.id IN (${placeholders})`,
        ...ids
      );
      if (esList.length === 0) {
        return NextResponse.json({ ok: false, error: "E-Service not found" }, { status: 404 });
      }

      const calculatedFee = esList.reduce((acc, curr) => acc + Number(curr.service_cost || 0), 0);
      fee = calculatedFee;
      serviceName = esList.map((e) => e.service_name).join(", ");
      categoryName = esList[0]?.category_name || "E-Governance Services";
    } else {
      return NextResponse.json({ ok: false, error: "Invalid service type" }, { status: 400 });
    }

    const amountPaise = Math.round(fee * 100);
    let orderId: string;
    let keyId: string | null = null;

    if (amountPaise > 0) {
      const creds = getRazorpayCredentials();
      if (!creds) {
        return NextResponse.json(
          { ok: false, error: "Online payment is not configured. Please contact the administrator." },
          { status: 503 }
        );
      }
      const order = await createRazorpayOrder(creds, amountPaise, `${serviceType}-${serviceId}-${Date.now()}`, {
        serviceType,
        serviceId: String(serviceId),
        phone: me.phone,
      });
      orderId = order.id;
      keyId = creds.keyId;
    } else {
      orderId = `free_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO paymentlog (id, serviceRequestId, gateway, orderId, paymentId, amount, status, signature, createdAt)
       VALUES (?, ?, 'RAZORPAY', ?, NULL, ?, 'PENDING', NULL, NOW(3))`,
      crypto.randomUUID(),
      `${serviceType}-${serviceId}`,
      orderId,
      fee
    );

    await recordPaymentInitiation({
      userId: me.customerId || 1,
      userType: "citizen",
      serviceType,
      serviceId,
      serviceName,
      categoryName,
      amount: fee,
      currency: "INR",
      razorpayOrderId: orderId,
      applicantName: body.applicantName || me.name || "",
      applicantPhone: body.applicantPhone || me.phone || "",
      applicantEmail: body.applicantEmail || "",
      metadata: {
        serviceIds: body.serviceIds,
      },
    }).catch((err) => console.warn("[recordPaymentInitiation warning]:", err));

    return NextResponse.json({
      ok: true,
      orderId,
      amount: fee,
      amountPaise,
      currency: "INR",
      key: keyId,
      keyId: keyId,
      serviceName,
      categoryName,
      serviceType,
    });
  } catch (error: any) {
    console.error("POST /api/payments/razorpay/order error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to initiate payment order" },
      { status: 500 }
    );
  }
}
