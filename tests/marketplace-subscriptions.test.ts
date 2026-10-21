import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { createAdminSession, adminSessionCookieName } from "../src/lib/admin-session";
import { POST as saveAdminPlan } from "../src/app/api/admin/marketplace-subscriptions/route";
import { signHmacSession } from "../src/lib/session-validator";
import { RETAILER_COOKIE_NAME } from "../src/lib/retailer-session";
import { POST as retailerSubscriptionAction } from "../src/app/api/retailer/marketplace/subscription/route";
import {
  addMarketplaceBillingPeriod,
  canApproveMarketplaceProduct,
  canListMarketplaceProducts,
  canShowMarketplaceProducts,
  isMarketplaceProductVisible,
  isMarketplaceSubscriptionActive,
  validateMarketplacePlan,
} from "../src/lib/marketplace-subscriptions";

const basePlan = {
  name: "Starter",
  billingPeriod: "MONTHLY",
  price: "99.00",
  benefits: { listingRights: true, marketplaceVisibility: true, maxProducts: 8, features: ["Customer marketplace listing"] },
};

test("administrator can create and edit a data-driven plan; non-admin cannot", async (t) => {
  const db = prisma as any;
  const originalExecute = db.$executeRawUnsafe;
  const originalQuery = db.$queryRawUnsafe;
  const writes: Array<{ query: string; values: unknown[] }> = [];
  db.$executeRawUnsafe = async (query: string, ...values: unknown[]) => { writes.push({ query, values }); return 1; };
  db.$queryRawUnsafe = async (query: string) => query.includes("LAST_INSERT_ID") ? [{ id: 81 }]
    : query.includes("COUNT(*) AS total") ? [{ total: 0 }] : [];
  t.after(() => { db.$executeRawUnsafe = originalExecute; db.$queryRawUnsafe = originalQuery; });

  const adminHeaders = { cookie: `${adminSessionCookieName}=${createAdminSession()}`, "content-type": "application/json" };
  const create = await saveAdminPlan(new Request("http://localhost/api/admin/marketplace-subscriptions", {
    method: "POST", headers: adminHeaders, body: JSON.stringify(basePlan),
  }) as any);
  assert.equal(create.status, 200);
  assert.match(await create.text(), /plan created/i);
  assert.equal(writes.some((write) => write.query.includes("INSERT INTO marketplace_subscription_plans") && write.values[0] === "Starter" && write.values[2] === 9900), true);
  assert.equal(writes.some((write) => write.query.includes("Weekly Starter") && write.query.includes("Yearly Partner")), true);

  const edited = { ...basePlan, id: 81, name: "Starter Plus", price: "149.50", benefits: { ...basePlan.benefits, maxProducts: 15 } };
  const update = await saveAdminPlan(new Request("http://localhost/api/admin/marketplace-subscriptions", {
    method: "POST", headers: adminHeaders, body: JSON.stringify(edited),
  }) as any);
  assert.equal(update.status, 200);
  assert.match(await update.text(), /plan updated/i);
  assert.equal(writes.some((write) => write.query.includes("UPDATE marketplace_subscription_plans") && write.values[0] === "Starter Plus" && write.values[2] === 14950), true);

  const denied = await saveAdminPlan(new Request("http://localhost/api/admin/marketplace-subscriptions", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(basePlan),
  }) as any);
  assert.equal(denied.status, 403);
});

test("retailer purchase creates an order and activates a subscription after verified payment", async (t) => {
  const db = prisma as any;
  const originalExecute = db.$executeRawUnsafe;
  const originalQuery = db.$queryRawUnsafe;
  const originalTransaction = db.$transaction;
  const originalFetch = globalThis.fetch;
  const originalEnv = { env: process.env.RAZORPAY_ENV, key: process.env.RAZORPAY_TEST_KEY_ID, secret: process.env.RAZORPAY_TEST_KEY_SECRET };
  process.env.RAZORPAY_ENV = "test";
  process.env.RAZORPAY_TEST_KEY_ID = "rzp_test_id";
  process.env.RAZORPAY_TEST_KEY_SECRET = "rzp_test_secret";

  const retailer = { id: 7, status: "Approved", is_approved: 1, name: "Shop owner", shop_name: "Test Shop", phone: "9000000000", email: "shop@example.test" };
  const metadata = JSON.stringify({ type: "MARKETPLACE_SUBSCRIPTION", planId: 3, planName: "Starter", billingPeriod: "MONTHLY", entitlements: basePlan.benefits });
  const attempt = { user_id: 7, user_type: "retailer", amount: 99, metadata, display_status: "INITIATED" };
  let attemptSelectCount = 0;
  let attemptUpdateCount = 0;
  let activatedValues: unknown[] = [];
  db.$executeRawUnsafe = async (query: string, ...values: unknown[]) => {
    if (query.includes("INSERT INTO retailer_marketplace_subscriptions")) activatedValues = values;
    return 1;
  };
  db.$queryRawUnsafe = async (query: string) => {
    if (query.includes("INFORMATION_SCHEMA.COLUMNS")) return [];
    if (query.includes("FROM retail_users")) return [retailer];
    if (query.includes("FROM marketplace_subscription_plans")) return [{ id: 3, name: "Starter", billing_period: "MONTHLY", price_paise: 9900, benefits_json: basePlan.benefits }];
    if (query.includes("SELECT * FROM payment_attempts WHERE razorpay_order_id")) return attemptSelectCount++ === 0 ? [] : [attempt];
    if (query.includes("FROM payment_attempts WHERE razorpay_order_id")) return [attempt];
    if (query.includes("SELECT id, created_at FROM payment_attempts")) return [attempt];
    if (query.includes("FROM retailer_marketplace_subscriptions")) return [];
    return [];
  };
  db.$transaction = async (callback: (tx: any) => Promise<unknown>) => callback({
    $queryRawUnsafe: async (query: string) => query.includes("LAST_INSERT_ID") ? [{ id: 55 }]
      : query.includes("FROM retail_users") ? [retailer]
        : query.includes("retailer_marketplace_subscriptions") ? [] : [],
    $executeRawUnsafe: async (query: string, ...values: unknown[]) => {
      if (query.includes("INSERT INTO retailer_marketplace_subscriptions")) activatedValues = values;
      return 1;
    },
  });
  globalThis.fetch = async () => new Response(JSON.stringify({ id: "order_marketplace_test", amount: 9900, currency: "INR" }), { status: 200, headers: { "content-type": "application/json" } });
  t.after(() => {
    db.$executeRawUnsafe = originalExecute; db.$queryRawUnsafe = originalQuery; db.$transaction = originalTransaction;
    globalThis.fetch = originalFetch;
    if (originalEnv.env === undefined) delete process.env.RAZORPAY_ENV; else process.env.RAZORPAY_ENV = originalEnv.env;
    if (originalEnv.key === undefined) delete process.env.RAZORPAY_TEST_KEY_ID; else process.env.RAZORPAY_TEST_KEY_ID = originalEnv.key;
    if (originalEnv.secret === undefined) delete process.env.RAZORPAY_TEST_KEY_SECRET; else process.env.RAZORPAY_TEST_KEY_SECRET = originalEnv.secret;
  });

  const cookie = signHmacSession({ id: 7, name: "Shop owner", role: "RETAILER" }, "RETAILER");
  const headers = { cookie: `${RETAILER_COOKIE_NAME}=${cookie}`, "content-type": "application/json" };
  const order = await retailerSubscriptionAction(new Request("http://localhost/api/retailer/marketplace/subscription", {
    method: "POST", headers, body: JSON.stringify({ action: "ORDER", planId: 3 }),
  }) as any);
  assert.equal(order.status, 200);
  assert.equal((await order.json()).orderId, "order_marketplace_test");

  const verify = await retailerSubscriptionAction(new Request("http://localhost/api/retailer/marketplace/subscription", {
    method: "POST", headers, body: JSON.stringify({ action: "VERIFY", razorpayOrderId: "order_marketplace_test", razorpayPaymentId: "pay_test_marketplace" }),
  }) as any);
  assert.equal(verify.status, 200);
  assert.match((await verify.text()), /Subscription activated/i);
  assert.equal(activatedValues[0], 7);
  assert.equal(activatedValues[1], 3);
  assert.ok(activatedValues[6] instanceof Date);
  assert.equal(isMarketplaceSubscriptionActive({ status: "ACTIVE", expiresAt: activatedValues[7] }), true);
});

test("subscription expiry, cancellation, approval gating, and customer visibility use shared entitlement rules", () => {
  const plan = validateMarketplacePlan(basePlan);
  assert.ok(plan);
  assert.equal(validateMarketplacePlan({ ...basePlan, billingPeriod: "DAILY" }), null);
  const start = new Date("2026-01-31T12:00:00.000Z");
  const expiry = addMarketplaceBillingPeriod(start, "MONTHLY");
  assert.equal(expiry.toISOString(), "2026-02-28T12:00:00.000Z");
  const entitlement = {
    subscriptionId: 1, status: "ACTIVE", expiresAt: new Date("2030-03-01T00:00:00.000Z"),
    ...plan.benefits,
  };
  assert.equal(isMarketplaceSubscriptionActive({ ...entitlement, expiresAt: expiry }, new Date("2026-02-28T00:00:00.000Z")), true);
  assert.equal(isMarketplaceSubscriptionActive({ ...entitlement, expiresAt: expiry }, new Date("2026-03-01T00:00:00.000Z")), false);
  assert.equal(isMarketplaceSubscriptionActive({ ...entitlement, status: "CANCELLED" }), false);
  assert.equal(canListMarketplaceProducts(entitlement), true);
  assert.equal(canApproveMarketplaceProduct({ retailerApproved: true, productStatus: "PENDING", entitlement, pendingAndLiveCount: 8 }), true);
  assert.equal(canApproveMarketplaceProduct({ retailerApproved: false, productStatus: "PENDING", entitlement, pendingAndLiveCount: 1 }), false);
  assert.equal(canApproveMarketplaceProduct({ retailerApproved: true, productStatus: "PENDING", entitlement, pendingAndLiveCount: 9 }), false);
  const entitlements = new Map([[7, entitlement]]);
  assert.equal(isMarketplaceProductVisible({ status: "APPROVED", retailerId: 7 }, entitlements), true);
  assert.equal(isMarketplaceProductVisible({ status: "PENDING", retailerId: 7 }, entitlements), false);
  assert.equal(isMarketplaceProductVisible({ status: "APPROVED", retailerId: 8 }, entitlements), false);
  assert.equal(canShowMarketplaceProducts({ ...entitlement, marketplaceVisibility: false }), false);
});
