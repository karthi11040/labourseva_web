import { prisma } from "@/lib/prisma";

export const MARKETPLACE_BILLING_PERIODS = ["WEEKLY", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"] as const;
export type MarketplaceBillingPeriod = (typeof MARKETPLACE_BILLING_PERIODS)[number];

export type MarketplaceBenefits = {
  listingRights: boolean;
  marketplaceVisibility: boolean;
  maxProducts: number;
  features: string[];
};

export type MarketplaceEntitlement = MarketplaceBenefits & {
  subscriptionId: number;
  status: string;
  expiresAt: Date;
};

type QueryExecutor = { $queryRawUnsafe: (query: string, ...values: any[]) => Promise<unknown> };
let marketplaceSchemaReady: Promise<void> | null = null;

export async function ensureMarketplaceSubscriptionTables() {
  if (!marketplaceSchemaReady) marketplaceSchemaReady = (async () => {
    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS marketplace_subscription_plans (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      billing_period VARCHAR(20) NOT NULL,
      price_paise BIGINT UNSIGNED NOT NULL,
      benefits_json JSON NOT NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_marketplace_plan_active (active, billing_period)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    const [planCount] = await prisma.$queryRawUnsafe<any[]>("SELECT COUNT(*) AS total FROM marketplace_subscription_plans");
    if (Number(planCount?.total) === 0) {
      await prisma.$executeRawUnsafe(`
      INSERT INTO marketplace_subscription_plans (name, billing_period, price_paise, benefits_json, active) VALUES
        ('Weekly Starter', 'WEEKLY', 9900, JSON_OBJECT('listingRights', true, 'marketplaceVisibility', true, 'maxProducts', 5, 'features', JSON_ARRAY('Submit up to 5 products for staff review', 'Approved products appear in the customer marketplace')), 1),
        ('Monthly Growth', 'MONTHLY', 29900, JSON_OBJECT('listingRights', true, 'marketplaceVisibility', true, 'maxProducts', 20, 'features', JSON_ARRAY('Submit up to 20 products for staff review', 'Approved products appear in the customer marketplace')), 1),
        ('Quarterly Business', 'QUARTERLY', 79900, JSON_OBJECT('listingRights', true, 'marketplaceVisibility', true, 'maxProducts', 60, 'features', JSON_ARRAY('Submit up to 60 products for staff review', 'Approved products appear in the customer marketplace')), 1),
        ('Half-Yearly Professional', 'HALF_YEARLY', 149900, JSON_OBJECT('listingRights', true, 'marketplaceVisibility', true, 'maxProducts', 150, 'features', JSON_ARRAY('Submit up to 150 products for staff review', 'Approved products appear in the customer marketplace')), 1),
        ('Yearly Partner', 'YEARLY', 249900, JSON_OBJECT('listingRights', true, 'marketplaceVisibility', true, 'maxProducts', 500, 'features', JSON_ARRAY('Submit up to 500 products for staff review', 'Approved products appear in the customer marketplace')), 1)
      `);
    }
    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS retailer_marketplace_subscriptions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      retailer_id INT NOT NULL,
      plan_id INT UNSIGNED NOT NULL,
      razorpay_order_id VARCHAR(100) NOT NULL,
      razorpay_payment_id VARCHAR(100) NOT NULL,
      amount_paise BIGINT UNSIGNED NOT NULL,
      entitlements_json JSON NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      starts_at DATETIME NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_retailer_subscription_order (razorpay_order_id),
      UNIQUE KEY uq_retailer_subscription_payment (razorpay_payment_id),
      KEY idx_retailer_subscription_entitlement (retailer_id, status, expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS retailer_marketplace_subscription_notifications (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      subscription_id BIGINT UNSIGNED NOT NULL,
      event_key VARCHAR(32) NOT NULL,
      channel VARCHAR(10) NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
      attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      next_attempt_at DATETIME NULL,
      last_error VARCHAR(500) NULL,
      sent_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_retailer_subscription_notice (subscription_id, event_key, channel),
      KEY idx_retailer_subscription_notice_retry (status, next_attempt_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  })();
  try {
    await marketplaceSchemaReady;
  } catch (error) {
    marketplaceSchemaReady = null;
    throw error;
  }
}

export function parseMarketplaceBenefits(value: unknown): MarketplaceBenefits | null {
  let raw: any = value;
  try {
    if (typeof raw === "string") raw = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (typeof raw.listingRights !== "boolean" || typeof raw.marketplaceVisibility !== "boolean") return null;
  if (!Number.isSafeInteger(Number(raw.maxProducts)) || Number(raw.maxProducts) < 1 || Number(raw.maxProducts) > 10000) return null;
  if (!Array.isArray(raw.features) || raw.features.length > 20 || raw.features.some((item: unknown) => typeof item !== "string" || !item.trim() || item.length > 200)) return null;
  return {
    listingRights: raw.listingRights,
    marketplaceVisibility: raw.marketplaceVisibility,
    maxProducts: Number(raw.maxProducts),
    features: raw.features.map((item: string) => item.trim()),
  };
}

export function isMarketplaceSubscriptionActive(
  subscription: { status?: unknown; expiresAt?: unknown; expires_at?: unknown } | null | undefined,
  now = new Date()
) {
  if (!subscription || String(subscription.status).toUpperCase() !== "ACTIVE") return false;
  const expiry = new Date(String(subscription.expiresAt ?? subscription.expires_at ?? "")).getTime();
  return Number.isFinite(expiry) && expiry > now.getTime();
}

export function canListMarketplaceProducts(entitlement: MarketplaceEntitlement | null | undefined, now = new Date()) {
  return isMarketplaceSubscriptionActive(entitlement, now) && Boolean(entitlement?.listingRights);
}

export function canShowMarketplaceProducts(entitlement: MarketplaceEntitlement | null | undefined, now = new Date()) {
  return canListMarketplaceProducts(entitlement, now) && Boolean(entitlement?.marketplaceVisibility);
}

export function isMarketplaceProductVisible(
  product: { status: unknown; retailerId: number },
  entitlements: Map<number, MarketplaceEntitlement>,
  now = new Date()
) {
  return String(product.status).toUpperCase() === "APPROVED" && canShowMarketplaceProducts(entitlements.get(product.retailerId), now);
}

export function canApproveMarketplaceProduct(input: {
  retailerApproved: boolean;
  productStatus: unknown;
  entitlement: MarketplaceEntitlement | null;
  pendingAndLiveCount: number;
}) {
  return input.retailerApproved && String(input.productStatus).toUpperCase() === "PENDING"
    && canListMarketplaceProducts(input.entitlement)
    && input.pendingAndLiveCount <= Number(input.entitlement?.maxProducts || 0);
}

export async function getMarketplaceEntitlements(
  retailerIds?: number[],
  executor: QueryExecutor = prisma
): Promise<Map<number, MarketplaceEntitlement>> {
  if (retailerIds && retailerIds.length === 0) return new Map();
  const whereIds = retailerIds ? `AND retailer_id IN (${retailerIds.map(() => "?").join(",")})` : "";
  const rows = await executor.$queryRawUnsafe(
    `SELECT id, retailer_id, entitlements_json, status, expires_at
     FROM retailer_marketplace_subscriptions
     WHERE status = 'ACTIVE' AND starts_at <= NOW() AND expires_at > NOW() ${whereIds}
     ORDER BY expires_at DESC, id DESC`,
    ...(retailerIds || [])
  ) as any[];
  const entitlements = new Map<number, MarketplaceEntitlement>();
  for (const row of rows) {
    const retailerId = Number(row.retailer_id);
    if (entitlements.has(retailerId)) continue;
    const benefits = parseMarketplaceBenefits(row.entitlements_json);
    if (!benefits) continue;
    const entitlement = {
      subscriptionId: Number(row.id),
      status: String(row.status),
      expiresAt: new Date(String(row.expires_at)),
      ...benefits,
    };
    if (canShowMarketplaceProducts(entitlement)) entitlements.set(retailerId, entitlement);
  }
  return entitlements;
}

export async function getMarketplaceEntitlement(retailerId: number, executor: QueryExecutor = prisma) {
  const rows = await executor.$queryRawUnsafe(
    `SELECT id, retailer_id, entitlements_json, status, expires_at
     FROM retailer_marketplace_subscriptions
     WHERE retailer_id = ? AND status = 'ACTIVE' AND starts_at <= NOW() AND expires_at > NOW()
     ORDER BY expires_at DESC, id DESC LIMIT 1`,
    retailerId
  ) as any[];
  const row = rows[0];
  const benefits = row ? parseMarketplaceBenefits(row.entitlements_json) : null;
  if (!row || !benefits) return null;
  const entitlement = {
    subscriptionId: Number(row.id),
    status: String(row.status),
    expiresAt: new Date(String(row.expires_at)),
    ...benefits,
  };
  return isMarketplaceSubscriptionActive(entitlement) ? entitlement : null;
}

export function addMarketplaceBillingPeriod(start: Date, period: MarketplaceBillingPeriod) {
  const result = new Date(start);
  if (period === "WEEKLY") {
    result.setDate(result.getDate() + 7);
    return result;
  }
  const months = period === "MONTHLY" ? 1 : period === "QUARTERLY" ? 3 : period === "HALF_YEARLY" ? 6 : 12;
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

export function validateMarketplacePlan(input: any) {
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  const period = String(input?.billingPeriod || "").toUpperCase() as MarketplaceBillingPeriod;
  const price = String(input?.price ?? "").trim();
  const priceMatch = /^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.exec(price);
  const maxProducts = Number(input?.benefits?.maxProducts);
  const features = input?.benefits?.features;
  if (!name || name.length > 120 || !MARKETPLACE_BILLING_PERIODS.includes(period) || !priceMatch) return null;
  const [rupees, fraction = ""] = price.split(".");
  const pricePaise = Number(rupees) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(pricePaise) || pricePaise < 100) return null;
  if (!Number.isSafeInteger(maxProducts) || maxProducts < 1 || maxProducts > 10000) return null;
  if (!Array.isArray(features) || features.length > 20 || features.some((item: unknown) => typeof item !== "string" || !item.trim() || item.length > 200)) return null;
  if (typeof input?.benefits?.listingRights !== "boolean" || typeof input?.benefits?.marketplaceVisibility !== "boolean") return null;
  return {
    name,
    billingPeriod: period,
    pricePaise,
    benefits: {
      listingRights: input.benefits.listingRights,
      marketplaceVisibility: input.benefits.marketplaceVisibility,
      maxProducts,
      features: features.map((item: string) => item.trim()),
    } satisfies MarketplaceBenefits,
  };
}
