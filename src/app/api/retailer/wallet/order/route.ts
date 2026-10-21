import { NextRequest, NextResponse } from "next/server";
import { getAuthRetailer } from "@/lib/auth-helpers";
import { createRazorpayOrder, getRazorpayCredentials } from "@/lib/razorpay";
import { recordPaymentInitiation } from "@/lib/payment-attempt-repository";
import { dispatchRetailerWalletPendingNotification } from "@/lib/notification-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const retailer = await getAuthRetailer(request);
    if (!retailer) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized Kendra session. Please sign in." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const numAmount = Number(body.amount);

    if (isNaN(numAmount) || numAmount < 10) {
      return NextResponse.json(
        { ok: false, error: "Please enter a minimum top-up amount of ₹10." },
        { status: 400 }
      );
    }

    if (numAmount > 500000) {
      return NextResponse.json(
        { ok: false, error: "Single top-up limit cannot exceed ₹5,00,000." },
        { status: 400 }
      );
    }

    const creds = getRazorpayCredentials();
    if (!creds) {
      return NextResponse.json(
        { ok: false, error: "Razorpay payment gateway credentials are not configured on the server." },
        { status: 500 }
      );
    }

    const amountPaise = Math.round(numAmount * 100);
    const receipt = `TOPUP_${retailer.id}_${Date.now()}`.slice(0, 40);

    const upiId = typeof body.upiId === "string" ? body.upiId.trim() : "";

    const notes: Record<string, string> = {
      retailerId: String(retailer.id),
      registrationNo: String(retailer.registration_no || ""),
      shopName: String(retailer.shop_name || retailer.name || ""),
      phone: String(retailer.phone || ""),
      type: "KENDRA_WALLET_TOPUP",
    };
    if (upiId) notes.upiId = upiId;

    const order = await createRazorpayOrder(creds, amountPaise, receipt, notes);

    // 1. Record pending payment attempt in database repository
    try {
      await recordPaymentInitiation({
        userId: retailer.id,
        userType: "retailer",
        serviceType: "DOCUMENT_SERVICE",
        serviceId: 0,
        serviceName: "Kendra Wallet Balance Top-Up",
        categoryName: "Kendra Prepaid Account",
        amount: numAmount,
        razorpayOrderId: order.id,
        applicantName: retailer.shop_name || retailer.name,
        applicantPhone: retailer.phone,
        applicantEmail: retailer.email,
        metadata: {
          type: "KENDRA_WALLET_TOPUP",
          receipt,
        },
      });
    } catch (attemptErr) {
      console.warn("[Wallet Order Attempt Log Warning]:", attemptErr);
    }

    // 2. Dispatch pending request notification email to retailer profile email
    if (retailer.email) {
      dispatchRetailerWalletPendingNotification({
        retailerId: retailer.id,
        name: retailer.name || retailer.shop_name || "Kendra Operator",
        shopName: retailer.shop_name,
        registrationNo: retailer.registration_no,
        email: retailer.email,
        amount: numAmount,
        orderId: order.id,
      }).catch((mailErr) => {
        console.warn("[Wallet Pending Email Warning]:", mailErr);
      });
    }

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      amountPaise: order.amount,
      amount: numAmount,
      currency: "INR",
      keyId: creds.keyId,
      receipt,
      retailer: {
        id: retailer.id,
        name: retailer.shop_name || retailer.name,
        phone: retailer.phone,
        email: retailer.email,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to create Razorpay payment order." },
      { status: 500 }
    );
  }
}
