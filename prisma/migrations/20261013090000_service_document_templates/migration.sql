CREATE TABLE `service_document_templates` (
  `service_id` INTEGER NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `storage_key` VARCHAR(500) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `byte_size` INTEGER NOT NULL,
  `page_count` INTEGER NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`service_id`),
  CONSTRAINT `service_document_templates_service_id_fkey`
    FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);
