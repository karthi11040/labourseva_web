import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAuthRetailer } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { addMarketplaceBillingPeriod, ensureMarketplaceSubscriptionTables, MARKETPLACE_BILLING_PERIODS } from "@/lib/marketplace-subscriptions";
import { dispatchMarketplaceSubscriptionNotice } from "@/lib/marketplace-subscription-notifications";
import { createRazorpayOrder, getRazorpayCredentials, getRazorpayEnv, verifyRazorpaySignature } from "@/lib/razorpay";
import { recordPaymentFailure, recordPaymentInitiation, recordPaymentSuccess } from "@/lib/payment-attempt-repository";
import { ensurePaymentAttemptColumns } from "@/lib/payment-db-sync";
import { emailMarketplaceSubscriptionReceipt, getMarketplaceSubscriptionReceipt } from "@/lib/marketplace-subscription-receipt";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const retailer = await getAuthRetailer(request);
  if (!retailer) return NextResponse.json({ ok: false, error: "Sign in to view subscription plans." }, { status: 401 });
  try {
    await ensureMarketplaceSubscriptionTables();
    const receiptId = Number(request.nextUrl.searchParams.get("receipt"));
    if (Number.isSafeInteger(receiptId) && receiptId > 0) {
      const receipt = await getMarketplaceSubscriptionReceipt(receiptId, Number(retailer.id));
      if (!receipt) return NextResponse.json({ ok: false, error: "Receipt not found." }, { status: 404 });
      return new NextResponse(receipt.bytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${receipt.filename}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    await prisma.$executeRawUnsafe(
      "UPDATE retailer_marketplace_subscriptions SET status = 'EXPIRED', updated_at = NOW() WHERE retailer_id = ? AND status = 'ACTIVE' AND expires_at <= NOW()",
      retailer.id
    );
    const [plans, subscriptions] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(
        "SELECT id, name, billing_period, price_paise, benefits_json FROM marketplace_subscription_plans WHERE active = 1 ORDER BY price_paise ASC, id ASC"
      ),
      prisma.$queryRawUnsafe<any[]>(
        `SELECT s.id, s.plan_id, s.status, s.starts_at, s.expires_at, s.amount_paise, s.razorpay_payment_id, s.created_at, p.name AS plan_name, p.billing_period
         FROM retailer_marketplace_subscriptions s
         LEFT JOIN marketplace_subscription_plans p ON p.id = s.plan_id
         WHERE s.retailer_id = ? ORDER BY s.id DESC LIMIT 10`,
        retailer.id
      ),
    ]);
    return NextResponse.json({
      ok: true,
      walletBalance: Number(retailer.wallet_balance || 0),
      plans: plans.map((plan) => ({
        id: Number(plan.id), name: String(plan.name), billingPeriod: String(plan.billing_period),
        price: (Number(plan.price_paise) / 100).toFixed(2),
        benefits: typeof plan.benefits_json === "string" ? JSON.parse(plan.benefits_json) : plan.benefits_json,
      })),
      subscriptions: subscriptions.map((sub) => ({
        id: Number(sub.id), planId: Number(sub.plan_id), planName: String(sub.plan_name || "Subscription plan"),
        billingPeriod: String(sub.billing_period || ""), status: String(sub.status),
        amount: (Number(sub.amount_paise) / 100).toFixed(2),
        startsAt: sub.starts_at ? new Date(sub.starts_at).toISOString() : null,
        expiresAt: sub.expires_at ? new Date(sub.expires_at).toISOString() : null,
        paymentReference: String(sub.razorpay_payment_id || ""),
        purchasedAt: sub.created_at ? new Date(sub.created_at).toISOString() : null,
        receiptAvailable: true,
      })),
    });
  } catch (error) {
    console.error("Retailer marketplace subscriptions could not be loaded:", error);
    return NextResponse.json({ ok: false, error: "Could not load subscription plans." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const retailer = await getAuthRetailer(request);
  if (!retailer) return NextResponse.json({ ok: false, error: "Sign in to manage your subscription." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false, error: "Choose a subscription action." }, { status: 400 });

  try {
    await ensureMarketplaceSubscriptionTables();
    if (body.action === "FAILURE") {
      const orderId = typeof body.razorpayOrderId === "string" ? body.razorpayOrderId : "";
      if (!orderId) return NextResponse.json({ ok: false, error: "Payment order is required." }, { status: 400 });
      const [attempt] = await prisma.$queryRawUnsafe<any[]>(
        "SELECT user_id, user_type, display_status FROM payment_attempts WHERE razorpay_order_id = ? LIMIT 1",
        orderId
      );
      if (!attempt || String(attempt.user_type).toLowerCase() !== "retailer" || Number(attempt.user_id) !== Number(retailer.id)) {
        return NextResponse.json({ ok: false, error: "This payment order does not belong to your retailer account." }, { status: 403 });
      }
      if (String(attempt.display_status) !== "SUCCESSFUL") {
        await recordPaymentFailure({
          razorpayOrderId: orderId,
          isCancelled: Boolean(body.isCancelled),
          isTimedOut: Boolean(body.isTimedOut),
          errorCode: typeof body.errorCode === "string" ? body.errorCode : undefined,
          errorDescription: typeof body.errorDescription === "string" ? body.errorDescription : undefined,
        });
      }
      return NextResponse.json({ ok: true, message: "Payment status recorded." });
    }
    if (body.action === "CANCEL") {
      const changed = await prisma.$executeRawUnsafe(
        `UPDATE retailer_marketplace_subscriptions SET status = 'CANCELLED', updated_at = NOW()
         WHERE retailer_id = ? AND status = 'ACTIVE' AND starts_at <= NOW() AND expires_at > NOW()`,
        retailer.id
      );
      if (!changed) return NextResponse.json({ ok: false, error: "There is no active subscription to cancel." }, { status: 409 });
      return NextResponse.json({ ok: true, message: "Subscription cancelled. Marketplace visibility has ended." });
    }

    if (body.action === "WALLET_PURCHASE") {
      const planId = Number(body.planId);
      if (!Number.isSafeInteger(planId) || planId <= 0) return NextResponse.json({ ok: false, error: "Choose a valid subscription plan." }, { status: 400 });
      const paymentRef = `WALLET-MKT-${retailer.id}-${randomUUID()}`;
      const activation = await prisma.$transaction(async (tx) => {
        const [seller] = await tx.$queryRawUnsafe<any[]>(
          "SELECT id, wallet_balance, status, is_approved, name, shop_name FROM retail_users WHERE id = ? LIMIT 1 FOR UPDATE",
          retailer.id
        );
        if (!seller || Number(seller.is_approved) !== 1 || String(seller.status || "").toLowerCase() !== "approved") {
          throw new Error("Your retailer account must be approved before purchasing a marketplace subscription.");
        }
        const [plan] = await tx.$queryRawUnsafe<any[]>(
          "SELECT id, name, billing_period, price_paise, benefits_json FROM marketplace_subscription_plans WHERE id = ? AND active = 1 LIMIT 1 FOR UPDATE",
          planId
        );
        if (!plan) throw new Error("This subscription plan is unavailable.");
        const period = MARKETPLACE_BILLING_PERIODS.find((value) => value === String(plan.billing_period).toUpperCase());
        if (!period) throw new Error("This plan has an invalid billing period.");
        const price = Number(plan.price_paise) / 100;
        if (!Number.isFinite(price) || price <= 0) throw new Error("This subscription plan has an invalid price.");
        if (Number(seller.wallet_balance || 0) < price) {
          throw new Error(`Insufficient wallet balance. Available: ₹${Number(seller.wallet_balance || 0).toFixed(2)}; required: ₹${price.toFixed(2)}.`);
        }
        const deducted = await tx.$executeRawUnsafe(
          "UPDATE retail_users SET wallet_balance = wallet_balance - ? WHERE id = ? AND wallet_balance >= ?",
          price, retailer.id, price
        );
        if (!deducted) throw new Error("Insufficient wallet balance. Please top up and try again.");

        await tx.$executeRawUnsafe(
          "UPDATE retailer_marketplace_subscriptions SET status = 'EXPIRED', updated_at = NOW() WHERE retailer_id = ? AND status = 'ACTIVE' AND expires_at <= NOW()",
          retailer.id
        );
        const [latest] = await tx.$queryRawUnsafe<any[]>(
          "SELECT expires_at FROM retailer_marketplace_subscriptions WHERE retailer_id = ? AND status = 'ACTIVE' AND expires_at > NOW() ORDER BY expires_at DESC, id DESC LIMIT 1 FOR UPDATE",
          retailer.id
        );
        const now = new Date();
        const latestExpiry = latest ? new Date(String(latest.expires_at)) : now;
        const startsAt = latestExpiry > now ? latestExpiry : now;
        const expiresAt = addMarketplaceBillingPeriod(startsAt, period);
        const benefits = typeof plan.benefits_json === "string" ? JSON.parse(plan.benefits_json) : plan.benefits_json;
        await tx.$executeRawUnsafe(
          `INSERT INTO retailer_marketplace_subscriptions
           (retailer_id, plan_id, razorpay_order_id, razorpay_payment_id, amount_paise, entitlements_json, status, starts_at, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
          retailer.id, Number(plan.id), paymentRef, paymentRef, Number(plan.price_paise), JSON.stringify(benefits), startsAt, expiresAt
        );
        const [created] = await tx.$queryRawUnsafe<any[]>("SELECT LAST_INSERT_ID() AS id");
        const subscriptionId = Number(created?.id);
        await tx.$executeRawUnsafe(
          `INSERT INTO retail_wallet_transactions (retailer_id, type, amount, source_type, source_id, description, created_at)
           VALUES (?, 'debit', ?, 'marketplace_subscription', ?, ?, NOW())`,
          retailer.id, price, subscriptionId, `Marketplace subscription: ${String(plan.name)} (${paymentRef})`
        );
        await tx.$executeRawUnsafe(
          `INSERT IGNORE INTO retailer_marketplace_subscription_notifications (subscription_id, event_key, channel)
           VALUES (?, 'ACTIVATED', 'EMAIL'), (?, 'ACTIVATED', 'SMS')`,
          subscriptionId, subscriptionId
        );
        const [balance] = await tx.$queryRawUnsafe<any[]>("SELECT wallet_balance FROM retail_users WHERE id = ? LIMIT 1", retailer.id);
        return { id: subscriptionId, startsAt, walletBalance: Number(balance?.wallet_balance || 0) };
      });
      await dispatchMarketplaceSubscriptionNotice(activation.id, "ACTIVATED").catch((error) => {
        console.error("Marketplace subscription confirmation could not be sent:", error);
      });
      await emailMarketplaceSubscriptionReceipt(activation.id).catch((error) => {
        console.error("Marketplace subscription receipt could not be sent:", error);
      });
      const scheduled = activation.startsAt > new Date();
      return NextResponse.json({
        ok: true,
        walletBalance: activation.walletBalance,
        message: scheduled
          ? `Wallet payment confirmed. Your plan starts after the current subscription ends on ${activation.startsAt.toLocaleDateString("en-IN")}.`
          : "Wallet payment complete. Your subscription is active and your products can now be submitted for staff approval.",
      });
    }

    if (body.action === "ORDER") {
      if (Number(retailer.is_approved) !== 1 || String(retailer.status || "").toLowerCase() !== "approved") {
        return NextResponse.json({ ok: false, error: "Your retailer account must be approved before purchasing a marketplace subscription." }, { status: 403 });
      }
      const planId = Number(body.planId);
      if (!Number.isSafeInteger(planId) || planId <= 0) return NextResponse.json({ ok: false, error: "Choose a valid subscription plan." }, { status: 400 });
      const [plan] = await prisma.$queryRawUnsafe<any[]>(
        "SELECT id, name, billing_period, price_paise, benefits_json FROM marketplace_subscription_plans WHERE id = ? AND active = 1 LIMIT 1",
        planId
      );
      if (!plan) return NextResponse.json({ ok: false, error: "This subscription plan is unavailable." }, { status: 404 });
      const period = MARKETPLACE_BILLING_PERIODS.find((value) => value === String(plan.billing_period).toUpperCase());
      if (!period) return NextResponse.json({ ok: false, error: "This plan has an invalid billing period." }, { status: 500 });
      const creds = getRazorpayCredentials();
      if (!creds) return NextResponse.json({ ok: false, error: "Razorpay credentials are not configured." }, { status: 503 });
      await ensurePaymentAttemptColumns();
      const amountPaise = Number(plan.price_paise);
      const receipt = `MKT_SUB_${retailer.id}_${Date.now()}`.slice(0, 40);
      const order = await createRazorpayOrder(creds, amountPaise, receipt, {
        type: "MARKETPLACE_SUBSCRIPTION", retailerId: String(retailer.id), planId: String(plan.id),
      });
      await prisma.$transaction(async (tx) => {
        const [seller] = await tx.$queryRawUnsafe<any[]>("SELECT id, status, is_approved FROM retail_users WHERE id = ? LIMIT 1 FOR UPDATE", retailer.id);
        if (!seller || Number(seller.is_approved) !== 1 || String(seller.status || "").toLowerCase() !== "approved") {
          throw new Error("Your retailer account must be approved before purchasing a marketplace subscription.");
        }
        const [pendingPayment] = await tx.$queryRawUnsafe<any[]>(
          `SELECT id FROM payment_attempts
           WHERE user_id = ? AND user_type = 'retailer' AND service_name LIKE 'Marketplace subscription:%'
             AND display_status IN ('INITIATED', 'PROCESSING', 'PENDING')
             AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE) LIMIT 1`,
          retailer.id
        );
        if (pendingPayment) throw new Error("A subscription payment is already waiting for a result. Finish or close that checkout first.");
        await recordPaymentInitiation({
          userId: retailer.id,
          userType: "retailer",
          serviceType: "DOCUMENT_SERVICE",
          serviceId: Number(plan.id),
          serviceName: `Marketplace subscription: ${String(plan.name).slice(0, 200)}`,
          categoryName: "Retail Marketplace Subscription",
          amount: amountPaise / 100,
          razorpayOrderId: order.id,
          applicantName: retailer.shop_name || retailer.name,
          applicantPhone: retailer.phone,
          applicantEmail: retailer.email,
          metadata: {
            type: "MARKETPLACE_SUBSCRIPTION", planId: Number(plan.id), planName: String(plan.name),
            billingPeriod: period,
            entitlements: typeof plan.benefits_json === "string" ? JSON.parse(plan.benefits_json) : plan.benefits_json,
          },
        });
      });
      return NextResponse.json({ ok: true, orderId: order.id, amountPaise, keyId: creds.keyId, currency: "INR" });
    }

    if (body.action === "VERIFY") {
      const orderId = typeof body.razorpayOrderId === "string" ? body.razorpayOrderId : "";
      const paymentId = typeof body.razorpayPaymentId === "string" ? body.razorpayPaymentId : "";
      const signature = typeof body.razorpaySignature === "string" ? body.razorpaySignature : "";
      if (!orderId || !paymentId) return NextResponse.json({ ok: false, error: "Payment confirmation details are incomplete." }, { status: 400 });
      const testPayment = getRazorpayEnv() === "test" && paymentId.startsWith("pay_test_");
      const creds = getRazorpayCredentials();
      if (!testPayment && (!creds?.keySecret || !signature || !verifyRazorpaySignature(creds.keySecret, orderId, paymentId, signature))) {
        return NextResponse.json({ ok: false, error: "Payment signature could not be verified." }, { status: 400 });
      }
      const [attempt] = await prisma.$queryRawUnsafe<any[]>(
        "SELECT user_id, user_type, amount, metadata, display_status FROM payment_attempts WHERE razorpay_order_id = ? LIMIT 1",
        orderId
      );
      if (!attempt || String(attempt.user_type).toLowerCase() !== "retailer" || Number(attempt.user_id) !== Number(retailer.id)) {
        return NextResponse.json({ ok: false, error: "This payment order does not belong to your retailer account." }, { status: 403 });
      }
      let metadata: any;
      try { metadata = typeof attempt.metadata === "string" ? JSON.parse(attempt.metadata) : attempt.metadata; } catch { metadata = null; }
      if (metadata?.type !== "MARKETPLACE_SUBSCRIPTION") return NextResponse.json({ ok: false, error: "This order is not a marketplace subscription." }, { status: 400 });
      if (String(attempt.display_status) === "SUCCESSFUL") {
        const [existing] = await prisma.$queryRawUnsafe<any[]>("SELECT id FROM retailer_marketplace_subscriptions WHERE razorpay_order_id = ? LIMIT 1", orderId);
        if (existing) return NextResponse.json({ ok: true, message: "Subscription is already active." });
      }
      const period = String(metadata.billingPeriod).toUpperCase() as typeof MARKETPLACE_BILLING_PERIODS[number];
      if (!MARKETPLACE_BILLING_PERIODS.includes(period)) return NextResponse.json({ ok: false, error: "Subscription billing period is invalid." }, { status: 400 });
      const benefits = metadata.entitlements;
      const amountPaise = Math.round(Number(attempt.amount) * 100);
      const now = new Date();
      const activation = await prisma.$transaction(async (tx) => {
        const [seller] = await tx.$queryRawUnsafe<any[]>("SELECT id, status, is_approved FROM retail_users WHERE id = ? LIMIT 1 FOR UPDATE", retailer.id);
        if (!seller) throw new Error("Retailer account was not found.");
        if (Number(seller.is_approved) !== 1 || String(seller.status || "").toLowerCase() !== "approved") throw new Error("Retailer account approval is required to activate a subscription.");
        const [existing] = await tx.$queryRawUnsafe<any[]>("SELECT id, starts_at FROM retailer_marketplace_subscriptions WHERE razorpay_order_id = ? LIMIT 1", orderId);
        if (existing) return { id: Number(existing.id), startsAt: new Date(String(existing.starts_at)) };
        const [latest] = await tx.$queryRawUnsafe<any[]>(
          "SELECT expires_at FROM retailer_marketplace_subscriptions WHERE retailer_id = ? AND status = 'ACTIVE' AND expires_at > NOW() ORDER BY expires_at DESC, id DESC LIMIT 1 FOR UPDATE",
          retailer.id
        );
        const latestExpiry = latest ? new Date(String(latest.expires_at)) : now;
        const startsAt = latestExpiry > now ? latestExpiry : now;
        const expiresAt = addMarketplaceBillingPeriod(startsAt, period);
        await tx.$executeRawUnsafe(
          `INSERT INTO retailer_marketplace_subscriptions
           (retailer_id, plan_id, razorpay_order_id, razorpay_payment_id, amount_paise, entitlements_json, status, starts_at, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
          retailer.id, Number(metadata.planId), orderId, paymentId, amountPaise, JSON.stringify(benefits), startsAt, expiresAt
        );
        const [created] = await tx.$queryRawUnsafe<any[]>("SELECT LAST_INSERT_ID() AS id");
        await tx.$executeRawUnsafe(
          `INSERT IGNORE INTO retailer_marketplace_subscription_notifications (subscription_id, event_key, channel)
           VALUES (?, 'ACTIVATED', 'EMAIL'), (?, 'ACTIVATED', 'SMS')`,
          Number(created?.id), Number(created?.id)
        );
        return { id: Number(created?.id), startsAt };
      });
      await recordPaymentSuccess({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
        applicationReference: `MARKETPLACE-SUB-${activation.id}`,
        receiptNo: `MKT-${activation.id}`,
        paymentMethod: "Razorpay",
      });
      await dispatchMarketplaceSubscriptionNotice(activation.id, "ACTIVATED").catch((error) => {
        console.error("Marketplace subscription confirmation could not be sent:", error);
      });
      await emailMarketplaceSubscriptionReceipt(activation.id).catch((error) => {
        console.error("Marketplace subscription receipt could not be sent:", error);
      });
      const scheduled = activation.startsAt > now;
      return NextResponse.json({ ok: true, message: scheduled
        ? `Payment verified. Your plan starts after the current subscription ends on ${activation.startsAt.toLocaleDateString("en-IN")}.`
        : "Subscription activated. Your products can now be submitted for staff approval." });
    }

    return NextResponse.json({ ok: false, error: "Choose a valid subscription action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not process the subscription.";
    const lowerMessage = message.toLowerCase();
    const status = lowerMessage.includes("active subscription") || lowerMessage.includes("already waiting") ? 409
      : lowerMessage.includes("retailer account must be approved") || lowerMessage.includes("approval is required") ? 403
        : lowerMessage.includes("insufficient wallet") || lowerMessage.includes("invalid price") ? 400
          : lowerMessage.includes("plan is unavailable") ? 404 : 500;
    if (status === 500) console.error("Retailer marketplace subscription action failed:", error);
    return NextResponse.json({ ok: false, error: status === 500 ? "Could not process the subscription." : message }, { status });
  }
}
