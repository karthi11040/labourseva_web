import { prisma } from "@/lib/prisma";

export async function ensureRetailerShopPhotos(retailerId: number) {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS retailer_shop_photos (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      retailer_id INT NOT NULL,
      photo_url VARCHAR(500) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY retailer_shop_photo_url (retailer_id, photo_url),
      KEY retailer_shop_photo_owner (retailer_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [retailer] = await prisma.$queryRawUnsafe<any[]>(
    "SELECT shop_image FROM retail_users WHERE id = ? LIMIT 1",
    retailerId
  );
  const legacyPhoto = String(retailer?.shop_image || "");
  if (legacyPhoto && !legacyPhoto.startsWith("[")) {
    const [count] = await prisma.$queryRawUnsafe<any[]>(
      "SELECT COUNT(*) AS total FROM retailer_shop_photos WHERE retailer_id = ?",
      retailerId
    );
    if (Number(count?.total || 0) === 0) {
      await prisma.$executeRawUnsafe(
        "INSERT IGNORE INTO retailer_shop_photos (retailer_id, photo_url) VALUES (?, ?)",
        retailerId,
        legacyPhoto
      );
      await prisma.$executeRawUnsafe("UPDATE retail_users SET shop_image = NULL WHERE id = ? AND shop_image = ?", retailerId, legacyPhoto);
    }
  }
}

export async function getRetailerShopPhotos(retailerId: number): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    "SELECT photo_url FROM retailer_shop_photos WHERE retailer_id = ? ORDER BY id",
    retailerId
  );
  return rows.map((row) => String(row.photo_url));
}
