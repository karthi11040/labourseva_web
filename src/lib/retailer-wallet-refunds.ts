import { prisma } from "@/lib/prisma";

export async function ensureRetailerWalletRefundTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS retailer_wallet_refunds (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      retailer_id INT NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      reason VARCHAR(500) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'REQUESTED',
      staff_note VARCHAR(500) NULL,
      requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME NULL,
      reviewed_by VARCHAR(120) NULL,
      paid_at DATETIME NULL,
      KEY idx_retail_wallet_refund_status (status, requested_at),
      KEY idx_retail_wallet_refund_retailer (retailer_id, requested_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}
