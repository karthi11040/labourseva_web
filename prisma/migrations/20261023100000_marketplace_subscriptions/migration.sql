CREATE TABLE `marketplace_subscription_plans` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `billing_period` VARCHAR(20) NOT NULL,
  `price_paise` BIGINT UNSIGNED NOT NULL,
  `benefits_json` JSON NOT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_marketplace_plan_active` (`active`, `billing_period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `retailer_marketplace_subscriptions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `retailer_id` INT NOT NULL,
  `plan_id` INT UNSIGNED NOT NULL,
  `razorpay_order_id` VARCHAR(100) NOT NULL,
  `razorpay_payment_id` VARCHAR(100) NOT NULL,
  `amount_paise` BIGINT UNSIGNED NOT NULL,
  `entitlements_json` JSON NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `starts_at` DATETIME NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_retailer_subscription_order` (`razorpay_order_id`),
  UNIQUE KEY `uq_retailer_subscription_payment` (`razorpay_payment_id`),
  KEY `idx_retailer_subscription_entitlement` (`retailer_id`, `status`, `expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
