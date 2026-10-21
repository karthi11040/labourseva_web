CREATE TABLE `retailer_marketplace_products` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `retailer_id` INT NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `category` VARCHAR(80) NOT NULL,
  `description` TEXT NOT NULL,
  `price_paise` BIGINT UNSIGNED NOT NULL,
  `stock` INT UNSIGNED NOT NULL DEFAULT 0,
  `photos_json` JSON NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  `rejection_reason` VARCHAR(500) NULL,
  `reviewed_at` DATETIME NULL,
  `reviewed_by` VARCHAR(120) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_marketplace_product_retailer` (`retailer_id`, `updated_at`),
  KEY `idx_marketplace_product_status` (`status`, `updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
