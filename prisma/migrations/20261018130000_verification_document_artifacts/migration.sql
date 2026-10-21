CREATE TABLE `verification_document_artifacts` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `owner_type` VARCHAR(20) NOT NULL,
  `owner_id` VARCHAR(64) NOT NULL,
  `doc_type` VARCHAR(40) NOT NULL,
  `storage_key` VARCHAR(255) NOT NULL,
  `sha256` CHAR(64) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `byte_size` INTEGER NOT NULL,
  `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `verification_document_artifacts_storage_key_key` (`storage_key`),
  INDEX `verification_document_artifacts_sha256_doc_type_idx` (`sha256`, `doc_type`),
  INDEX `verification_document_artifacts_owner_type_owner_id_doc_type_idx` (`owner_type`, `owner_id`, `doc_type`)
);
