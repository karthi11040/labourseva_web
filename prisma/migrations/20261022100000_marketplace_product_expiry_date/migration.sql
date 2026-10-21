SET @has_expiry_date = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'retailer_marketplace_products'
    AND COLUMN_NAME = 'expiry_date'
);
SET @expiry_migration_sql = IF(
  @has_expiry_date = 0,
  'ALTER TABLE retailer_marketplace_products ADD COLUMN expiry_date DATE NULL AFTER photos_json',
  'SELECT 1'
);
PREPARE expiry_migration FROM @expiry_migration_sql;
EXECUTE expiry_migration;
DEALLOCATE PREPARE expiry_migration;
