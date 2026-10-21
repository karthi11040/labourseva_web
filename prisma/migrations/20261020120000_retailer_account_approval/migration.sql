ALTER TABLE `retail_users`
  ADD COLUMN `is_approved` TINYINT(1) NOT NULL DEFAULT 0;

UPDATE `retail_users`
SET `is_approved` = CASE WHEN LOWER(`status`) = 'approved' THEN 1 ELSE 0 END;
