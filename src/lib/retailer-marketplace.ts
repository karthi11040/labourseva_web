import { prisma } from "@/lib/prisma";

export async function ensureRetailerMarketplaceProductsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS retailer_marketplace_products (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      retailer_id INT NOT NULL,
      name VARCHAR(120) NOT NULL,
      category VARCHAR(80) NOT NULL,
      description TEXT NOT NULL,
      price_paise BIGINT UNSIGNED NOT NULL,
      stock INT UNSIGNED NOT NULL DEFAULT 0,
      photos_json JSON NOT NULL,
      expiry_date DATE NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
      rejection_reason VARCHAR(500) NULL,
      reviewed_at DATETIME NULL,
      reviewed_by VARCHAR(120) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_marketplace_product_retailer (retailer_id, updated_at),
      KEY idx_marketplace_product_status (status, updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  const columns = await prisma.$queryRawUnsafe<any[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'retailer_marketplace_products' AND COLUMN_NAME = 'expiry_date'`
  );
  if (!columns.length) {
    try {
      await prisma.$executeRawUnsafe("ALTER TABLE retailer_marketplace_products ADD COLUMN expiry_date DATE NULL AFTER photos_json");
    } catch (error) {
      if (!String((error as Error)?.message || error).toLowerCase().includes("duplicate column")) throw error;
    }
  }
}

export function isApprovedRetailer(retailer: { status?: unknown; is_approved?: unknown }) {
  return Number(retailer.is_approved) === 1 && String(retailer.status || "").toLowerCase() === "approved";
}

export function parseProductPrice(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(raw)) return null;
  const [rupees, fraction = ""] = raw.split(".");
  const paise = Number(rupees) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(paise) && paise > 0 ? paise : null;
}

export function parseProductPhotos(value: unknown, retailerId: number): string[] | null {
  if (!Array.isArray(value) || value.length > 5 || value.some((photo) => typeof photo !== "string")) return null;
  const photos = value as string[];
  const ownedPhoto = new RegExp(`^${retailerId}-product-[0-9a-f-]+\\.(?:jpg|png|webp)$`, "i");
  if (new Set(photos).size !== photos.length || photos.some((photo) => photo.length > 100 || !ownedPhoto.test(photo))) return null;
  return photos;
}

export function productPhotoUrl(filename: string, productId: number) {
  const params = new URLSearchParams({ file: filename });
  params.set("productId", String(productId));
  return `/api/retailer/marketplace/photo?${params.toString()}`;
}

export function parseProductPhotosJson(value: unknown): string[] {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) && parsed.every((photo) => typeof photo === "string") ? parsed : [];
  } catch {
    return [];
  }
}
