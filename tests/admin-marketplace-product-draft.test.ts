import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { createAdminSession, adminSessionCookieName } from "../src/lib/admin-session";
import { POST as createMarketplaceProduct } from "../src/app/api/admin/marketplace-products/route";
import { categoryNeedsExpiryDate, parseProductExpiryDate } from "../src/lib/marketplace-product-rules";

test("admin product creation stores an unlisted draft with no photos", async (t) => {
  const db = prisma as any;
  const originalExecute = db.$executeRawUnsafe;
  const originalQuery = db.$queryRawUnsafe;
  const originalTransaction = db.$transaction;
  const inserts: unknown[][] = [];
  const productUpdates: unknown[][] = [];
  const photo = `7-product-${randomUUID()}.jpg`;
  const photoPath = path.join(process.cwd(), "data", "private", "marketplace", photo);
  let draftRow: Record<string, unknown> = { id: 42, retailer_id: 7, category: "Tools", photos_json: "[]", expiry_date: null, status: "DRAFT" };
  db.$executeRawUnsafe = async () => 0;
  db.$queryRawUnsafe = async () => [];
  db.$transaction = async (callback: (tx: any) => Promise<unknown>) => callback({
    $queryRawUnsafe: async (query: string) => query.includes("LAST_INSERT_ID") ? [{ id: 42 }]
      : query.includes("FROM retailer_marketplace_subscriptions") ? [{
        id: 1, retailer_id: 7, status: "ACTIVE", expires_at: new Date(Date.now() + 30 * 86400000),
        entitlements_json: { listingRights: true, marketplaceVisibility: true, maxProducts: 10, features: [] },
      }]
      : query.includes("FROM retailer_marketplace_products") ? [draftRow]
        : query.includes("FROM retail_users") ? [{ id: 7, status: "Approved", is_approved: 1 }] : [{ id: 7 }],
    $executeRawUnsafe: async (query: string, ...values: unknown[]) => {
      if (query.includes("INSERT INTO retailer_marketplace_products")) inserts.push(values);
      if (query.includes("UPDATE retailer_marketplace_products")) productUpdates.push(values);
      return 1;
    },
  });
  t.after(() => {
    db.$executeRawUnsafe = originalExecute;
    db.$queryRawUnsafe = originalQuery;
    db.$transaction = originalTransaction;
  });
  await mkdir(path.dirname(photoPath), { recursive: true });
  await writeFile(photoPath, "image fixture");
  t.after(async () => { await rm(photoPath, { force: true }); });

  const response = await createMarketplaceProduct(new Request("http://localhost/api/admin/marketplace-products", {
    method: "POST",
    headers: {
      cookie: `${adminSessionCookieName}=${createAdminSession()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      action: "CREATE_DRAFT", retailerId: "7", name: "Safety Gloves", category: "Safety",
      description: "Protective work gloves", price: "125.50", stock: "4",
    }),
  }) as any);

  assert.equal(response.status, 200);
  assert.equal(inserts.length, 1);
  assert.deepEqual(inserts[0], [7, "Safety Gloves", "Safety", "Protective work gloves", 12550, 4, "[]", null]);
  assert.match(await response.text(), /must add photos and submit/i);

  const publishResponse = await createMarketplaceProduct(new Request("http://localhost/api/admin/marketplace-products", {
    method: "POST",
    headers: {
      cookie: `${adminSessionCookieName}=${createAdminSession()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ action: "PUBLISH_DRAFT", id: 42 }),
  }) as any);
  assert.equal(publishResponse.status, 400);
  assert.match(await publishResponse.text(), /at least one valid product image/i);
  assert.equal(productUpdates.length, 0);

  draftRow = { ...draftRow, category: "Groceries", photos_json: JSON.stringify([photo]) };
  const missingExpiryResponse = await createMarketplaceProduct(new Request("http://localhost/api/admin/marketplace-products", {
    method: "POST",
    headers: { cookie: `${adminSessionCookieName}=${createAdminSession()}`, "content-type": "application/json" },
    body: JSON.stringify({ action: "PUBLISH_DRAFT", id: 42 }),
  }) as any);
  assert.equal(missingExpiryResponse.status, 400);
  assert.match(await missingExpiryResponse.text(), /expiry date required/i);
  assert.equal(productUpdates.length, 0);

  draftRow = { ...draftRow, expiry_date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10) };
  const liveResponse = await createMarketplaceProduct(new Request("http://localhost/api/admin/marketplace-products", {
    method: "POST",
    headers: { cookie: `${adminSessionCookieName}=${createAdminSession()}`, "content-type": "application/json" },
    body: JSON.stringify({ action: "PUBLISH_DRAFT", id: 42 }),
  }) as any);
  assert.equal(liveResponse.status, 200);
  assert.match(await liveResponse.text(), /is live in the marketplace/i);
  assert.equal(productUpdates.length, 1);
});

test("expiry dates are required for expiry-tracked categories and validated as real dates", () => {
  assert.equal(categoryNeedsExpiryDate("Groceries"), true);
  assert.equal(categoryNeedsExpiryDate("Home & Kitchen"), false);
  assert.equal(parseProductExpiryDate("2026-02-30"), undefined);
  assert.equal(parseProductExpiryDate("2026-10-20"), "2026-10-20");
});
