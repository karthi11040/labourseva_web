CREATE TABLE `retailer_marketplace_subscription_notifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `subscription_id` BIGINT UNSIGNED NOT NULL,
  `event_key` VARCHAR(32) NOT NULL,
  `channel` VARCHAR(10) NOT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  `attempts` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `next_attempt_at` DATETIME NULL,
  `last_error` VARCHAR(500) NULL,
  `sent_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_retailer_subscription_notice` (`subscription_id`, `event_key`, `channel`),
  KEY `idx_retailer_subscription_notice_retry` (`status`, `next_attempt_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
