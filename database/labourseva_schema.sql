-- LabourSeva full database schema (MySQL 8 / MariaDB 10.6+).
-- Import into an EMPTY database via Hostinger phpMyAdmin > Import.
-- Generated from prisma/schema.prisma + prisma/migrations/create_helpdesk_tables.sql.
-- Regenerate: npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- CreateTable
CREATE TABLE `districts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(10) NULL,
    `name` VARCHAR(100) NOT NULL,
    `nameTa` VARCHAR(150) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `districts_code_key`(`code`),
    UNIQUE INDEX `districts_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `taluks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `district_id` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `nameTa` VARCHAR(150) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `taluks_district_id_name_key`(`district_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `panchayaths` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `taluk_id` INTEGER NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `nameTa` VARCHAR(180) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `panchayaths_taluk_id_name_key`(`taluk_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `role` ENUM('CUSTOMER', 'RETAILER', 'DISTRIBUTOR', 'AGENT', 'EMPLOYEE', 'ADMIN') NOT NULL,
    `status` ENUM('PENDING_VERIFICATION', 'PENDING_KYC', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'FLAGGED', 'CLOSED') NOT NULL DEFAULT 'PENDING_VERIFICATION',
    `statusReason` VARCHAR(500) NULL,
    `suspendedAt` DATETIME(3) NULL,
    `phoneHash` CHAR(64) NULL,
    `phoneEnc` TEXT NULL,
    `phoneVerifiedAt` DATETIME(3) NULL,
    `emailHash` CHAR(64) NULL,
    `emailEnc` TEXT NULL,
    `emailVerifiedAt` DATETIME(3) NULL,
    `passwordHash` VARCHAR(255) NULL,
    `passwordChangedAt` DATETIME(3) NULL,
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,
    `totpSecretEnc` TEXT NULL,
    `totpEnabledAt` DATETIME(3) NULL,
    `failedLoginCount` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `lastLoginIp` VARCHAR(45) NULL,
    `language` ENUM('EN', 'TA') NOT NULL DEFAULT 'EN',
    `themePref` ENUM('LIGHT', 'DARK', 'SYSTEM') NOT NULL DEFAULT 'LIGHT',
    `createdById` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `users_emailHash_key`(`emailHash`),
    INDEX `users_role_status_idx`(`role`, `status`),
    INDEX `users_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `users_phoneHash_role_key`(`phoneHash`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profiles` (
    `userId` CHAR(36) NOT NULL,
    `fullNameEnc` TEXT NOT NULL,
    `fatherNameEnc` TEXT NULL,
    `dobEnc` TEXT NULL,
    `genderEnc` TEXT NULL,
    `addressLine1Enc` TEXT NULL,
    `addressLine2Enc` TEXT NULL,
    `districtId` INTEGER NULL,
    `talukId` INTEGER NULL,
    `panchayathId` INTEGER NULL,
    `pincode` CHAR(6) NULL,
    `aadhaarLast4` CHAR(4) NULL,
    `panEnc` TEXT NULL,
    `panHash` CHAR(64) NULL,
    `voterIdEnc` TEXT NULL,
    `voterIdHash` CHAR(64) NULL,
    `photoDocumentId` CHAR(36) NULL,
    `completionPct` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `profiles_photoDocumentId_key`(`photoDocumentId`),
    INDEX `profiles_panHash_idx`(`panHash`),
    INDEX `profiles_voterIdHash_idx`(`voterIdHash`),
    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `distributor_profiles` (
    `userId` CHAR(36) NOT NULL,
    `businessName` VARCHAR(150) NOT NULL,
    `contactPersonEnc` TEXT NULL,
    `addressEnc` TEXT NULL,
    `districtId` INTEGER NULL,
    `pincode` CHAR(6) NULL,
    `gstinHash` CHAR(64) NULL,
    `gstinEnc` TEXT NULL,
    `kycStatus` ENUM('NOT_SUBMITTED', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'NOT_SUBMITTED',
    `agreementDocumentId` CHAR(36) NULL,
    `maxRetailers` INTEGER NULL,
    `approvedById` CHAR(36) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `distributor_profiles_kycStatus_idx`(`kycStatus`),
    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `distributor_regions` (
    `distributorId` CHAR(36) NOT NULL,
    `districtId` INTEGER NOT NULL,

    PRIMARY KEY (`distributorId`, `districtId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `retailer_profiles` (
    `userId` CHAR(36) NOT NULL,
    `distributorId` CHAR(36) NULL,
    `shopName` VARCHAR(150) NOT NULL,
    `ownerNameEnc` TEXT NULL,
    `shopAddressEnc` TEXT NULL,
    `districtId` INTEGER NULL,
    `talukId` INTEGER NULL,
    `panchayathId` INTEGER NULL,
    `pincode` CHAR(6) NULL,
    `gstinHash` CHAR(64) NULL,
    `gstinEnc` TEXT NULL,
    `kycStatus` ENUM('NOT_SUBMITTED', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'NOT_SUBMITTED',
    `onboardedVia` VARCHAR(30) NOT NULL DEFAULT 'DISTRIBUTOR_INVITE',
    `approvedById` CHAR(36) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `retailer_profiles_distributorId_idx`(`distributorId`),
    INDEX `retailer_profiles_kycStatus_idx`(`kycStatus`),
    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `retailer_marketplace_products` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `retailer_id` INTEGER NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `category` VARCHAR(80) NOT NULL,
    `description` TEXT NOT NULL,
    `price_paise` BIGINT UNSIGNED NOT NULL,
    `stock` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `photos_json` JSON NOT NULL,
    `expiry_date` DATE NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    `rejection_reason` VARCHAR(500) NULL,
    `reviewed_at` DATETIME(0) NULL,
    `reviewed_by` VARCHAR(120) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `idx_marketplace_product_retailer`(`retailer_id`, `updated_at`),
    INDEX `idx_marketplace_product_status`(`status`, `updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marketplace_subscription_plans` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `billing_period` VARCHAR(20) NOT NULL,
    `price_paise` BIGINT UNSIGNED NOT NULL,
    `benefits_json` JSON NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `idx_marketplace_plan_active`(`active`, `billing_period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `retailer_marketplace_subscriptions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `retailer_id` INTEGER NOT NULL,
    `plan_id` INTEGER UNSIGNED NOT NULL,
    `razorpay_order_id` VARCHAR(100) NOT NULL,
    `razorpay_payment_id` VARCHAR(100) NOT NULL,
    `amount_paise` BIGINT UNSIGNED NOT NULL,
    `entitlements_json` JSON NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `starts_at` DATETIME(0) NOT NULL,
    `expires_at` DATETIME(0) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `uq_retailer_subscription_order`(`razorpay_order_id`),
    UNIQUE INDEX `uq_retailer_subscription_payment`(`razorpay_payment_id`),
    INDEX `idx_retailer_subscription_entitlement`(`retailer_id`, `status`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agent_profiles` (
    `userId` CHAR(36) NOT NULL,
    `distributorId` CHAR(36) NULL,
    `districtId` INTEGER NULL,
    `kycStatus` ENUM('NOT_SUBMITTED', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'NOT_SUBMITTED',
    `approvedById` CHAR(36) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `agent_profiles_distributorId_idx`(`distributorId`),
    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agent_customers` (
    `agentId` CHAR(36) NOT NULL,
    `customerId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `agent_customers_customerId_idx`(`customerId`),
    PRIMARY KEY (`agentId`, `customerId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partner_invites` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `distributorId` CHAR(36) NOT NULL,
    `role` ENUM('CUSTOMER', 'RETAILER', 'DISTRIBUTOR', 'AGENT', 'EMPLOYEE', 'ADMIN') NOT NULL,
    `phoneHash` CHAR(64) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `partner_invites_tokenHash_key`(`tokenHash`),
    INDEX `partner_invites_phoneHash_idx`(`phoneHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_profiles` (
    `userId` CHAR(36) NOT NULL,
    `employeeCode` VARCHAR(30) NOT NULL,
    `department` VARCHAR(80) NULL,
    `designation` VARCHAR(80) NULL,
    `canVerify` BOOLEAN NOT NULL DEFAULT true,
    `canSign` BOOLEAN NOT NULL DEFAULT false,
    `canHandleQueries` BOOLEAN NOT NULL DEFAULT true,
    `canManageIam` BOOLEAN NOT NULL DEFAULT false,
    `maxOpenTasks` INTEGER NOT NULL DEFAULT 25,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `employee_profiles_employeeCode_key`(`employeeCode`),
    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `signature_assets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` CHAR(36) NOT NULL,
    `districtId` INTEGER NULL,
    `kind` ENUM('STAMP_IMAGE', 'DSC_REFERENCE') NOT NULL,
    `storageKey` VARCHAR(128) NULL,
    `sha256` CHAR(64) NULL,
    `dscRef` VARCHAR(200) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `validFrom` DATETIME(3) NULL,
    `validTo` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `signature_assets_employeeId_active_idx`(`employeeId`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_profiles` (
    `userId` CHAR(36) NOT NULL,
    `isSuperadmin` BOOLEAN NOT NULL DEFAULT false,
    `permissions` JSON NOT NULL,
    `ipAllowlist` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` CHAR(36) NOT NULL,
    `portal` ENUM('CUSTOMER', 'GUEST', 'RETAILER', 'DISTRIBUTOR', 'AGENT', 'EMPLOYEE', 'ADMIN') NOT NULL,
    `userId` CHAR(36) NULL,
    `applicationId` CHAR(36) NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `idleExpiresAt` DATETIME(3) NOT NULL,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ip` VARCHAR(45) NULL,
    `userAgent` VARCHAR(300) NULL,
    `deviceLabel` VARCHAR(100) NULL,
    `revokedAt` DATETIME(3) NULL,
    `revokedById` CHAR(36) NULL,
    `revokeReason` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sessions_tokenHash_key`(`tokenHash`),
    INDEX `sessions_userId_portal_revokedAt_idx`(`userId`, `portal`, `revokedAt`),
    INDEX `sessions_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `otp_codes` (
    `id` CHAR(36) NOT NULL,
    `purpose` ENUM('LOGIN', 'REGISTER', 'RECOVERY', 'GUEST_CHECKOUT', 'GUEST_TRACK', 'STEP_UP') NOT NULL,
    `portal` ENUM('CUSTOMER', 'GUEST', 'RETAILER', 'DISTRIBUTOR', 'AGENT', 'EMPLOYEE', 'ADMIN') NOT NULL,
    `phoneHash` CHAR(64) NOT NULL,
    `codeHash` CHAR(64) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 5,
    `expiresAt` DATETIME(3) NOT NULL,
    `consumedAt` DATETIME(3) NULL,
    `contextRef` VARCHAR(64) NULL,
    `ip` VARCHAR(45) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `otp_codes_phoneHash_purpose_createdAt_idx`(`phoneHash`, `purpose`, `createdAt`),
    INDEX `otp_codes_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `staff_recovery_codes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` CHAR(36) NOT NULL,
    `codeHash` VARCHAR(255) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `staff_recovery_codes_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `login_attempts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `portal` ENUM('CUSTOMER', 'GUEST', 'RETAILER', 'DISTRIBUTOR', 'AGENT', 'EMPLOYEE', 'ADMIN') NOT NULL,
    `identifierHash` CHAR(64) NOT NULL,
    `success` BOOLEAN NOT NULL,
    `reason` VARCHAR(60) NULL,
    `ip` VARCHAR(45) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `login_attempts_identifierHash_createdAt_idx`(`identifierHash`, `createdAt`),
    INDEX `login_attempts_ip_createdAt_idx`(`ip`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rate_limit_buckets` (
    `key` VARCHAR(160) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `windowStart` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `rate_limit_buckets_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `parentId` INTEGER NULL,
    `slug` VARCHAR(80) NOT NULL,
    `nameEn` VARCHAR(120) NOT NULL,
    `nameTa` VARCHAR(200) NULL,
    `iconKey` VARCHAR(40) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `service_categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `services` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `categoryId` INTEGER NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `nameEn` VARCHAR(160) NOT NULL,
    `nameTa` VARCHAR(260) NULL,
    `descriptionEn` TEXT NULL,
    `descriptionTa` TEXT NULL,
    `iconKey` VARCHAR(40) NULL,
    `feePaise` BIGINT NOT NULL,
    `processingDays` INTEGER NOT NULL DEFAULT 3,
    `allowGuest` BOOLEAN NOT NULL DEFAULT false,
    `allowAssisted` BOOLEAN NOT NULL DEFAULT true,
    `requiresSignature` BOOLEAN NOT NULL DEFAULT true,
    `currentVersion` INTEGER NOT NULL DEFAULT 1,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `services_code_key`(`code`),
    INDEX `services_categoryId_active_idx`(`categoryId`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_schema_versions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serviceId` INTEGER NOT NULL,
    `version` INTEGER NOT NULL,
    `fieldSchema` JSON NOT NULL,
    `checklistTemplate` JSON NULL,
    `publishedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `publishedById` CHAR(36) NULL,

    UNIQUE INDEX `service_schema_versions_serviceId_version_key`(`serviceId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_document_requirements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serviceId` INTEGER NOT NULL,
    `code` VARCHAR(40) NOT NULL,
    `labelEn` VARCHAR(160) NOT NULL,
    `labelTa` VARCHAR(260) NULL,
    `required` BOOLEAN NOT NULL DEFAULT true,
    `allowedMime` JSON NULL,
    `maxSizeKb` INTEGER NOT NULL DEFAULT 5120,

    UNIQUE INDEX `service_document_requirements_serviceId_code_key`(`serviceId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commission_rules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serviceId` INTEGER NULL,
    `retailerBps` INTEGER NOT NULL,
    `distributorBps` INTEGER NOT NULL,
    `agentBps` INTEGER NOT NULL DEFAULT 0,
    `effectiveFrom` DATETIME(3) NOT NULL,
    `effectiveTo` DATETIME(3) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdById` CHAR(36) NULL,

    INDEX `commission_rules_serviceId_active_effectiveFrom_idx`(`serviceId`, `active`, `effectiveFrom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `applications` (
    `id` CHAR(36) NOT NULL,
    `referenceNo` VARCHAR(24) NOT NULL,
    `serviceId` INTEGER NOT NULL,
    `schemaVersionId` INTEGER NOT NULL,
    `applicantType` ENUM('CUSTOMER', 'GUEST', 'ASSISTED_RETAILER', 'ASSISTED_AGENT') NOT NULL,
    `customerId` CHAR(36) NULL,
    `guestPhoneHash` CHAR(64) NULL,
    `guestPhoneEnc` TEXT NULL,
    `guestNameEnc` TEXT NULL,
    `submittedById` CHAR(36) NULL,
    `submittedByRole` ENUM('CUSTOMER', 'RETAILER', 'DISTRIBUTOR', 'AGENT', 'EMPLOYEE', 'ADMIN') NULL,
    `retailerId` CHAR(36) NULL,
    `distributorId` CHAR(36) NULL,
    `agentId` CHAR(36) NULL,
    `status` ENUM('DRAFT', 'PENDING_PAYMENT', 'PAID_PENDING_VERIFICATION', 'IN_REVIEW', 'RETURNED', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `formDataEnc` LONGTEXT NOT NULL,
    `feePaise` BIGINT NOT NULL,
    `paymentMode` ENUM('GATEWAY', 'WALLET') NULL,
    `paidAt` DATETIME(3) NULL,
    `assignedEmployeeId` CHAR(36) NULL,
    `assignedAt` DATETIME(3) NULL,
    `slaDueAt` DATETIME(3) NULL,
    `returnCount` INTEGER NOT NULL DEFAULT 0,
    `lastRemarks` VARCHAR(1000) NULL,
    `submittedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `applications_referenceNo_key`(`referenceNo`),
    INDEX `applications_status_slaDueAt_idx`(`status`, `slaDueAt`),
    INDEX `applications_customerId_status_idx`(`customerId`, `status`),
    INDEX `applications_retailerId_status_idx`(`retailerId`, `status`),
    INDEX `applications_distributorId_idx`(`distributorId`),
    INDEX `applications_agentId_idx`(`agentId`),
    INDEX `applications_assignedEmployeeId_status_idx`(`assignedEmployeeId`, `status`),
    INDEX `applications_guestPhoneHash_idx`(`guestPhoneHash`),
    INDEX `applications_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `application_status_history` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `applicationId` CHAR(36) NOT NULL,
    `fromStatus` ENUM('DRAFT', 'PENDING_PAYMENT', 'PAID_PENDING_VERIFICATION', 'IN_REVIEW', 'RETURNED', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED') NULL,
    `toStatus` ENUM('DRAFT', 'PENDING_PAYMENT', 'PAID_PENDING_VERIFICATION', 'IN_REVIEW', 'RETURNED', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED') NOT NULL,
    `actorId` CHAR(36) NULL,
    `actorRole` VARCHAR(20) NULL,
    `remarks` VARCHAR(1000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `application_status_history_applicationId_createdAt_idx`(`applicationId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `application_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `applicationId` CHAR(36) NOT NULL,
    `documentId` CHAR(36) NOT NULL,
    `requirementId` INTEGER NULL,
    `label` VARCHAR(160) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `application_documents_applicationId_documentId_key`(`applicationId`, `documentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verification_reviews` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `applicationId` CHAR(36) NOT NULL,
    `reviewerId` CHAR(36) NOT NULL,
    `round` INTEGER NOT NULL DEFAULT 1,
    `checklist` JSON NULL,
    `decision` ENUM('PENDING', 'APPROVED', 'RETURNED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `remarks` VARCHAR(1000) NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `decidedAt` DATETIME(3) NULL,

    INDEX `verification_reviews_reviewerId_decision_idx`(`reviewerId`, `decision`),
    UNIQUE INDEX `verification_reviews_applicationId_round_key`(`applicationId`, `round`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `certificates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `applicationId` CHAR(36) NOT NULL,
    `serialNo` VARCHAR(40) NOT NULL,
    `verifyCode` VARCHAR(40) NOT NULL,
    `documentId` CHAR(36) NOT NULL,
    `sha256` CHAR(64) NOT NULL,
    `signedById` CHAR(36) NOT NULL,
    `signatureAssetId` INTEGER NOT NULL,
    `signedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,
    `revokedReason` VARCHAR(300) NULL,

    UNIQUE INDEX `certificates_applicationId_key`(`applicationId`),
    UNIQUE INDEX `certificates_serialNo_key`(`serialNo`),
    UNIQUE INDEX `certificates_verifyCode_key`(`verifyCode`),
    UNIQUE INDEX `certificates_documentId_key`(`documentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documents` (
    `id` CHAR(36) NOT NULL,
    `ownerUserId` CHAR(36) NULL,
    `kind` ENUM('IDENTITY', 'APPLICATION_UPLOAD', 'KYC', 'CERTIFICATE_OUTPUT', 'RECEIPT', 'TICKET_ATTACHMENT', 'PARTNER_AGREEMENT', 'PROFILE_PHOTO') NOT NULL,
    `originalNameEnc` TEXT NULL,
    `storageKey` VARCHAR(128) NOT NULL,
    `mimeType` VARCHAR(80) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `sha256` CHAR(64) NOT NULL,
    `keyVersion` INTEGER NOT NULL DEFAULT 1,
    `scanStatus` ENUM('PENDING', 'CLEAN', 'INFECTED', 'ERROR', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `status` ENUM('ACTIVE', 'DELETED', 'PURGED') NOT NULL DEFAULT 'ACTIVE',
    `retentionUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `documents_storageKey_key`(`storageKey`),
    INDEX `documents_ownerUserId_kind_idx`(`ownerUserId`, `kind`),
    INDEX `documents_retentionUntil_status_idx`(`retentionUntil`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_access_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `documentId` CHAR(36) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `issuedToUserId` CHAR(36) NULL,
    `issuedToPortal` ENUM('CUSTOMER', 'GUEST', 'RETAILER', 'DISTRIBUTOR', 'AGENT', 'EMPLOYEE', 'ADMIN') NOT NULL,
    `purpose` ENUM('VIEW', 'DOWNLOAD') NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `ip` VARCHAR(45) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `document_access_tokens_tokenHash_key`(`tokenHash`),
    INDEX `document_access_tokens_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` CHAR(36) NOT NULL,
    `purpose` ENUM('APPLICATION_FEE', 'WALLET_TOPUP', 'REGISTRATION_FEE') NOT NULL,
    `provider` ENUM('RAZORPAY', 'PAYU') NOT NULL DEFAULT 'RAZORPAY',
    `userId` CHAR(36) NULL,
    `applicationId` CHAR(36) NULL,
    `guestPhoneHash` CHAR(64) NULL,
    `targetWalletId` CHAR(36) NULL,
    `providerOrderId` VARCHAR(80) NOT NULL,
    `providerPaymentId` VARCHAR(80) NULL,
    `amountPaise` BIGINT NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'INR',
    `status` ENUM('CREATED', 'PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED') NOT NULL DEFAULT 'CREATED',
    `method` VARCHAR(30) NULL,
    `signatureVerifiedAt` DATETIME(3) NULL,
    `capturedAt` DATETIME(3) NULL,
    `failureCode` VARCHAR(60) NULL,
    `failureReason` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_providerOrderId_key`(`providerOrderId`),
    UNIQUE INDEX `payments_providerPaymentId_key`(`providerPaymentId`),
    INDEX `payments_userId_status_idx`(`userId`, `status`),
    INDEX `payments_applicationId_idx`(`applicationId`),
    INDEX `payments_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_events` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `paymentId` CHAR(36) NULL,
    `provider` ENUM('RAZORPAY', 'PAYU') NOT NULL,
    `providerEventId` VARCHAR(100) NOT NULL,
    `eventType` VARCHAR(60) NOT NULL,
    `payload` JSON NOT NULL,
    `signatureValid` BOOLEAN NOT NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,
    `processingError` VARCHAR(500) NULL,

    INDEX `payment_events_paymentId_idx`(`paymentId`),
    UNIQUE INDEX `payment_events_provider_providerEventId_key`(`provider`, `providerEventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refunds` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `paymentId` CHAR(36) NOT NULL,
    `amountPaise` BIGINT NOT NULL,
    `reason` VARCHAR(300) NOT NULL,
    `status` ENUM('REQUESTED', 'APPROVED', 'PROCESSED', 'FAILED') NOT NULL DEFAULT 'REQUESTED',
    `providerRefundId` VARCHAR(80) NULL,
    `requestedById` CHAR(36) NULL,
    `approvedById` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,

    UNIQUE INDEX `refunds_providerRefundId_key`(`providerRefundId`),
    INDEX `refunds_paymentId_idx`(`paymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receipts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `paymentId` CHAR(36) NOT NULL,
    `receiptNo` VARCHAR(30) NOT NULL,
    `documentId` CHAR(36) NULL,
    `sha256` CHAR(64) NULL,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `receipts_paymentId_key`(`paymentId`),
    UNIQUE INDEX `receipts_receiptNo_key`(`receiptNo`),
    UNIQUE INDEX `receipts_documentId_key`(`documentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `idempotency_keys` (
    `key` VARCHAR(128) NOT NULL,
    `scope` VARCHAR(60) NOT NULL,
    `requestHash` CHAR(64) NOT NULL,
    `responseStatus` INTEGER NULL,
    `responseBody` JSON NULL,
    `lockedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `idempotency_keys_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallets` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `balancePaise` BIGINT NOT NULL DEFAULT 0,
    `version` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('ACTIVE', 'FROZEN') NOT NULL DEFAULT 'ACTIVE',
    `lowBalanceThresholdPaise` BIGINT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `wallets_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallet_ledger` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `walletId` CHAR(36) NOT NULL,
    `direction` ENUM('CREDIT', 'DEBIT') NOT NULL,
    `amountPaise` BIGINT NOT NULL,
    `balanceAfterPaise` BIGINT NOT NULL,
    `refType` ENUM('PAYMENT_TOPUP', 'APPLICATION_FEE', 'COMMISSION', 'REFERRAL_REWARD', 'REFUND', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'PAYOUT_HOLD', 'PAYOUT_RELEASE') NOT NULL,
    `refId` VARCHAR(64) NULL,
    `narration` VARCHAR(200) NULL,
    `idempotencyKey` VARCHAR(128) NOT NULL,
    `createdById` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `wallet_ledger_idempotencyKey_key`(`idempotencyKey`),
    INDEX `wallet_ledger_walletId_id_idx`(`walletId`, `id`),
    INDEX `wallet_ledger_refType_refId_idx`(`refType`, `refId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fund_transfers` (
    `id` CHAR(36) NOT NULL,
    `fromWalletId` CHAR(36) NOT NULL,
    `toWalletId` CHAR(36) NOT NULL,
    `amountPaise` BIGINT NOT NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'REJECTED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `note` VARCHAR(200) NULL,
    `requestedByRetailer` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,

    INDEX `fund_transfers_fromWalletId_createdAt_idx`(`fromWalletId`, `createdAt`),
    INDEX `fund_transfers_toWalletId_createdAt_idx`(`toWalletId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallet_adjustment_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `walletId` CHAR(36) NOT NULL,
    `direction` ENUM('CREDIT', 'DEBIT') NOT NULL,
    `amountPaise` BIGINT NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `status` ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'APPLIED') NOT NULL DEFAULT 'PENDING_APPROVAL',
    `requestedById` CHAR(36) NOT NULL,
    `approvedById` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `decidedAt` DATETIME(3) NULL,

    INDEX `wallet_adjustment_requests_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commission_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `applicationId` CHAR(36) NOT NULL,
    `walletId` CHAR(36) NOT NULL,
    `beneficiaryRole` ENUM('CUSTOMER', 'RETAILER', 'DISTRIBUTOR', 'AGENT', 'EMPLOYEE', 'ADMIN') NOT NULL,
    `bps` INTEGER NOT NULL,
    `amountPaise` BIGINT NOT NULL,
    `status` ENUM('ACCRUED', 'CREDITED', 'REVERSED') NOT NULL DEFAULT 'ACCRUED',
    `ledgerId` BIGINT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `commission_entries_walletId_status_idx`(`walletId`, `status`),
    UNIQUE INDEX `commission_entries_applicationId_walletId_beneficiaryRole_key`(`applicationId`, `walletId`, `beneficiaryRole`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `referral_codes` (
    `userId` CHAR(36) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `referral_codes_code_key`(`code`),
    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `referrals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `referrerId` CHAR(36) NOT NULL,
    `referredUserId` CHAR(36) NOT NULL,
    `codeUsed` VARCHAR(20) NOT NULL,
    `status` ENUM('PENDING', 'QUALIFIED', 'REWARDED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `qualifyingPaymentId` CHAR(36) NULL,
    `rewardPaise` BIGINT NULL,
    `rewardLedgerId` BIGINT NULL,
    `flaggedReason` VARCHAR(200) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `qualifiedAt` DATETIME(3) NULL,
    `rewardedAt` DATETIME(3) NULL,

    UNIQUE INDEX `referrals_referredUserId_key`(`referredUserId`),
    INDEX `referrals_referrerId_status_idx`(`referrerId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tickets` (
    `id` CHAR(36) NOT NULL,
    `referenceNo` VARCHAR(24) NOT NULL,
    `type` ENUM('FEEDBACK', 'GRIEVANCE', 'CONTACT', 'HELPDESK', 'ADVERTISE', 'CAREERS', 'PARTNER') NOT NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'WAITING_ON_CITIZEN', 'ESCALATED', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `createdByUserId` CHAR(36) NULL,
    `contactNameEnc` TEXT NULL,
    `contactPhoneHash` CHAR(64) NULL,
    `contactPhoneEnc` TEXT NULL,
    `contactEmailEnc` TEXT NULL,
    `subject` VARCHAR(200) NOT NULL,
    `category` VARCHAR(60) NULL,
    `linkedApplicationId` CHAR(36) NULL,
    `assignedEmployeeId` CHAR(36) NULL,
    `slaDueAt` DATETIME(3) NULL,
    `escalatedAt` DATETIME(3) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `resolutionNote` VARCHAR(1000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tickets_referenceNo_key`(`referenceNo`),
    INDEX `tickets_status_slaDueAt_idx`(`status`, `slaDueAt`),
    INDEX `tickets_assignedEmployeeId_status_idx`(`assignedEmployeeId`, `status`),
    INDEX `tickets_type_status_idx`(`type`, `status`),
    INDEX `tickets_contactPhoneHash_idx`(`contactPhoneHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_messages` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `ticketId` CHAR(36) NOT NULL,
    `authorType` ENUM('CITIZEN', 'STAFF', 'SYSTEM') NOT NULL,
    `authorId` CHAR(36) NULL,
    `channel` ENUM('SMS', 'EMAIL', 'INAPP', 'WEB') NOT NULL DEFAULT 'WEB',
    `bodyEnc` LONGTEXT NOT NULL,
    `attachmentDocumentId` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ticket_messages_ticketId_createdAt_idx`(`ticketId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kyc_submissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` CHAR(36) NOT NULL,
    `forRole` ENUM('CUSTOMER', 'RETAILER', 'DISTRIBUTOR', 'AGENT', 'EMPLOYEE', 'ADMIN') NOT NULL,
    `status` ENUM('NOT_SUBMITTED', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED',
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewerId` CHAR(36) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reason` VARCHAR(500) NULL,

    INDEX `kyc_submissions_status_submittedAt_idx`(`status`, `submittedAt`),
    INDEX `kyc_submissions_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kyc_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kycSubmissionId` INTEGER NOT NULL,
    `documentId` CHAR(36) NOT NULL,
    `docType` VARCHAR(40) NOT NULL,

    UNIQUE INDEX `kyc_documents_kycSubmissionId_documentId_key`(`kycSubmissionId`, `documentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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

    INDEX `verification_document_artifacts_sha256_doc_type_idx`(`sha256`, `doc_type`),
    INDEX `verification_document_artifacts_owner_type_owner_id_doc_type_idx`(`owner_type`, `owner_id`, `doc_type`),
    UNIQUE INDEX `verification_document_artifacts_storage_key_key`(`storage_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `iam_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `targetUserId` CHAR(36) NOT NULL,
    `action` ENUM('ACTIVATE', 'SUSPEND', 'REACTIVATE', 'FLAG', 'REVOKE_SESSIONS', 'GRANT_ACCESS', 'RESET_CREDENTIALS', 'CLOSE_ACCOUNT') NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED') NOT NULL DEFAULT 'PENDING',
    `requestedById` CHAR(36) NOT NULL,
    `approvedById` CHAR(36) NULL,
    `reason` VARCHAR(500) NOT NULL,
    `decisionNote` VARCHAR(500) NULL,
    `needsSecondApprover` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `decidedAt` DATETIME(3) NULL,
    `executedAt` DATETIME(3) NULL,

    INDEX `iam_requests_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `iam_requests_targetUserId_idx`(`targetUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `anomaly_flags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` CHAR(36) NOT NULL,
    `kind` VARCHAR(60) NOT NULL,
    `severity` INTEGER NOT NULL DEFAULT 1,
    `details` JSON NULL,
    `status` ENUM('OPEN', 'REVIEWING', 'DISMISSED', 'ESCALATED') NOT NULL DEFAULT 'OPEN',
    `raisedById` CHAR(36) NULL,
    `resolvedById` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,

    INDEX `anomaly_flags_status_severity_idx`(`status`, `severity`),
    INDEX `anomaly_flags_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(60) NOT NULL,
    `channel` ENUM('SMS', 'EMAIL', 'INAPP', 'WEB') NOT NULL,
    `language` ENUM('EN', 'TA') NOT NULL,
    `dltTemplateId` VARCHAR(60) NULL,
    `subject` VARCHAR(200) NULL,
    `body` TEXT NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `notification_templates_key_channel_language_key`(`key`, `channel`, `language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `userId` CHAR(36) NULL,
    `channel` ENUM('SMS', 'EMAIL', 'INAPP', 'WEB') NOT NULL,
    `templateKey` VARCHAR(60) NOT NULL,
    `eventKey` VARCHAR(128) NULL,
    `relatedEntityType` VARCHAR(64) NULL,
    `relatedEntityId` VARCHAR(64) NULL,
    `language` ENUM('EN', 'TA') NOT NULL DEFAULT 'EN',
    `toHash` CHAR(64) NULL,
    `toEnc` TEXT NULL,
    `status` ENUM('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED') NOT NULL DEFAULT 'QUEUED',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `nextAttemptAt` DATETIME(3) NULL,
    `providerMessageId` VARCHAR(80) NULL,
    `error` VARCHAR(300) NULL,
    `payload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sentAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `readAt` DATETIME(3) NULL,

    UNIQUE INDEX `notifications_eventKey_key`(`eventKey`),
    INDEX `notifications_status_nextAttemptAt_idx`(`status`, `nextAttemptAt`),
    INDEX `notifications_userId_channel_readAt_idx`(`userId`, `channel`, `readAt`),
    INDEX `notifications_userId_readAt_createdAt_idx`(`userId`, `readAt`, `createdAt`),
    INDEX `notifications_relatedEntityType_relatedEntityId_idx`(`relatedEntityType`, `relatedEntityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jobs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `queue` VARCHAR(40) NOT NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'DONE', 'FAILED', 'DEAD') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 5,
    `runAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lockedAt` DATETIME(3) NULL,
    `lockedBy` VARCHAR(60) NULL,
    `lastError` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,

    INDEX `jobs_status_runAt_idx`(`status`, `runAt`),
    INDEX `jobs_queue_status_idx`(`queue`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `announcements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kind` ENUM('POPUP', 'NOTICE', 'SLIDER', 'AD_BANNER', 'SCHEME', 'TICKER') NOT NULL,
    `titleEn` VARCHAR(200) NOT NULL,
    `titleTa` VARCHAR(300) NULL,
    `bodyEn` TEXT NULL,
    `bodyTa` TEXT NULL,
    `imageUrl` VARCHAR(300) NULL,
    `linkUrl` VARCHAR(300) NULL,
    `portalTargets` JSON NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `publishedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdById` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `announcements_kind_active_publishedAt_idx`(`kind`, `active`, `publishedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_availability` (
    `serviceId` INTEGER NOT NULL,
    `districtId` INTEGER NOT NULL,
    `available` BOOLEAN NOT NULL DEFAULT true,
    `reason` VARCHAR(200) NULL,
    `updatedById` CHAR(36) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `service_availability_districtId_idx`(`districtId`),
    PRIMARY KEY (`serviceId`, `districtId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_signature_placements` (
    `serviceId` INTEGER NOT NULL,
    `page` INTEGER NOT NULL DEFAULT 1,
    `xFrac` DECIMAL(6, 5) NOT NULL,
    `yFrac` DECIMAL(6, 5) NOT NULL,
    `wFrac` DECIMAL(6, 5) NOT NULL DEFAULT 0.25000,
    `hFrac` DECIMAL(6, 5) NOT NULL DEFAULT 0.15000,

    PRIMARY KEY (`serviceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_document_templates` (
    `service_id` INTEGER NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `storage_key` VARCHAR(500) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `byte_size` INTEGER NOT NULL,
    `page_count` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`service_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_service_assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeId` CHAR(36) NOT NULL,
    `serviceId` INTEGER NOT NULL,
    `districtId` INTEGER NULL,
    `assignedById` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `employee_service_assignments_serviceId_districtId_idx`(`serviceId`, `districtId`),
    UNIQUE INDEX `employee_service_assignments_employeeId_serviceId_districtId_key`(`employeeId`, `serviceId`, `districtId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `registration_fees` (
    `role` ENUM('CUSTOMER', 'RETAILER', 'DISTRIBUTOR', 'AGENT', 'EMPLOYEE', 'ADMIN') NOT NULL,
    `feePaise` BIGINT NOT NULL DEFAULT 0,
    `referrerRewardPaise` BIGINT NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `updatedById` CHAR(36) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`role`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payout_methods` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` CHAR(36) NOT NULL,
    `type` ENUM('UPI', 'BANK') NOT NULL,
    `upiIdEnc` TEXT NULL,
    `holderNameEnc` TEXT NULL,
    `accountNumberEnc` TEXT NULL,
    `accountLast4` CHAR(4) NULL,
    `ifscEnc` TEXT NULL,
    `bankName` VARCHAR(100) NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `verifiedAt` DATETIME(3) NULL,
    `verifiedById` CHAR(36) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payout_methods_userId_active_idx`(`userId`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payout_requests` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `walletId` CHAR(36) NOT NULL,
    `methodId` INTEGER NOT NULL,
    `amountPaise` BIGINT NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `holdLedgerId` BIGINT NULL,
    `releaseLedgerId` BIGINT NULL,
    `utrRef` VARCHAR(60) NULL,
    `proofDocumentId` CHAR(36) NULL,
    `adminNote` VARCHAR(500) NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `decidedById` CHAR(36) NULL,
    `decidedAt` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,

    INDEX `payout_requests_status_requestedAt_idx`(`status`, `requestedAt`),
    INDEX `payout_requests_userId_requestedAt_idx`(`userId`, `requestedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partner_api_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `provider` VARCHAR(30) NOT NULL,
    `serviceCode` VARCHAR(40) NOT NULL,
    `requestRef` VARCHAR(64) NOT NULL,
    `applicationId` CHAR(36) NULL,
    `userId` CHAR(36) NULL,
    `amountPaise` BIGINT NOT NULL DEFAULT 0,
    `status` ENUM('INITIATED', 'SUCCESS', 'FAILED', 'PENDING_AT_PROVIDER') NOT NULL DEFAULT 'INITIATED',
    `providerRef` VARCHAR(100) NULL,
    `ackNoEnc` TEXT NULL,
    `requestMetaEnc` TEXT NULL,
    `response` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `partner_api_transactions_requestRef_key`(`requestRef`),
    INDEX `partner_api_transactions_provider_status_idx`(`provider`, `status`),
    INDEX `partner_api_transactions_applicationId_idx`(`applicationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schemes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tag` VARCHAR(60) NULL,
    `titleEn` VARCHAR(200) NOT NULL,
    `titleTa` VARCHAR(300) NULL,
    `descriptionEn` TEXT NULL,
    `descriptionTa` TEXT NULL,
    `eligibility` VARCHAR(500) NULL,
    `benefit` VARCHAR(500) NULL,
    `iconUrl` VARCHAR(300) NULL,
    `applyUrl` VARCHAR(500) NULL,
    `brochureUrl` VARCHAR(500) NULL,
    `buttonLabel` VARCHAR(60) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `download_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titleEn` VARCHAR(200) NOT NULL,
    `titleTa` VARCHAR(300) NULL,
    `category` VARCHAR(80) NULL,
    `storageKey` VARCHAR(128) NOT NULL,
    `fileType` VARCHAR(20) NULL,
    `sizeBytes` INTEGER NULL,
    `description` VARCHAR(500) NULL,
    `downloadCount` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_listings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titleEn` VARCHAR(200) NOT NULL,
    `department` VARCHAR(150) NULL,
    `location` VARCHAR(150) NULL,
    `vacancies` INTEGER NULL,
    `payScale` VARCHAR(120) NULL,
    `jobType` VARCHAR(60) NULL,
    `lastDate` DATE NULL,
    `descriptionEn` TEXT NULL,
    `skillTags` JSON NULL,
    `applyUrl` VARCHAR(500) NULL,
    `open` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `actorId` CHAR(36) NULL,
    `actorRole` VARCHAR(20) NULL,
    `portal` ENUM('CUSTOMER', 'GUEST', 'RETAILER', 'DISTRIBUTOR', 'AGENT', 'EMPLOYEE', 'ADMIN') NULL,
    `action` VARCHAR(80) NOT NULL,
    `entityType` VARCHAR(50) NULL,
    `entityId` VARCHAR(64) NULL,
    `reason` VARCHAR(500) NULL,
    `meta` JSON NULL,
    `ip` VARCHAR(45) NULL,
    `userAgent` VARCHAR(300) NULL,
    `prevHash` CHAR(64) NULL,
    `hash` CHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `audit_logs_actorId_createdAt_idx`(`actorId`, `createdAt`),
    INDEX `audit_logs_action_createdAt_idx`(`action`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings` (
    `key` VARCHAR(100) NOT NULL,
    `value` JSON NOT NULL,
    `description` VARCHAR(200) NULL,
    `updatedById` CHAR(36) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` CHAR(36) NULL,
    `phoneHash` CHAR(64) NULL,
    `purpose` VARCHAR(60) NOT NULL,
    `policyVersion` VARCHAR(20) NOT NULL,
    `granted` BOOLEAN NOT NULL DEFAULT true,
    `grantedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `withdrawnAt` DATETIME(3) NULL,
    `ip` VARCHAR(45) NULL,

    INDEX `consents_userId_purpose_idx`(`userId`, `purpose`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data_deletion_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` CHAR(36) NOT NULL,
    `status` ENUM('REQUESTED', 'UNDER_REVIEW', 'COMPLETED', 'REJECTED') NOT NULL DEFAULT 'REQUESTED',
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedById` CHAR(36) NULL,
    `completedAt` DATETIME(3) NULL,
    `notes` VARCHAR(500) NULL,

    INDEX `data_deletion_requests_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `taluks` ADD CONSTRAINT `taluks_district_id_fkey` FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `panchayaths` ADD CONSTRAINT `panchayaths_taluk_id_fkey` FOREIGN KEY (`taluk_id`) REFERENCES `taluks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_districtId_fkey` FOREIGN KEY (`districtId`) REFERENCES `districts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_talukId_fkey` FOREIGN KEY (`talukId`) REFERENCES `taluks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_panchayathId_fkey` FOREIGN KEY (`panchayathId`) REFERENCES `panchayaths`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_photoDocumentId_fkey` FOREIGN KEY (`photoDocumentId`) REFERENCES `documents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `distributor_profiles` ADD CONSTRAINT `distributor_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `distributor_profiles` ADD CONSTRAINT `distributor_profiles_districtId_fkey` FOREIGN KEY (`districtId`) REFERENCES `districts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `distributor_regions` ADD CONSTRAINT `distributor_regions_distributorId_fkey` FOREIGN KEY (`distributorId`) REFERENCES `distributor_profiles`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `distributor_regions` ADD CONSTRAINT `distributor_regions_districtId_fkey` FOREIGN KEY (`districtId`) REFERENCES `districts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `retailer_profiles` ADD CONSTRAINT `retailer_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `retailer_profiles` ADD CONSTRAINT `retailer_profiles_distributorId_fkey` FOREIGN KEY (`distributorId`) REFERENCES `distributor_profiles`(`userId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `retailer_profiles` ADD CONSTRAINT `retailer_profiles_districtId_fkey` FOREIGN KEY (`districtId`) REFERENCES `districts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `retailer_profiles` ADD CONSTRAINT `retailer_profiles_talukId_fkey` FOREIGN KEY (`talukId`) REFERENCES `taluks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `retailer_profiles` ADD CONSTRAINT `retailer_profiles_panchayathId_fkey` FOREIGN KEY (`panchayathId`) REFERENCES `panchayaths`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agent_profiles` ADD CONSTRAINT `agent_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agent_profiles` ADD CONSTRAINT `agent_profiles_distributorId_fkey` FOREIGN KEY (`distributorId`) REFERENCES `distributor_profiles`(`userId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agent_profiles` ADD CONSTRAINT `agent_profiles_districtId_fkey` FOREIGN KEY (`districtId`) REFERENCES `districts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agent_customers` ADD CONSTRAINT `agent_customers_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `agent_profiles`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agent_customers` ADD CONSTRAINT `agent_customers_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_invites` ADD CONSTRAINT `partner_invites_distributorId_fkey` FOREIGN KEY (`distributorId`) REFERENCES `distributor_profiles`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_profiles` ADD CONSTRAINT `employee_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `signature_assets` ADD CONSTRAINT `signature_assets_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee_profiles`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `signature_assets` ADD CONSTRAINT `signature_assets_districtId_fkey` FOREIGN KEY (`districtId`) REFERENCES `districts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_profiles` ADD CONSTRAINT `admin_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_recovery_codes` ADD CONSTRAINT `staff_recovery_codes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_categories` ADD CONSTRAINT `service_categories_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `service_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `service_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_schema_versions` ADD CONSTRAINT `service_schema_versions_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_document_requirements` ADD CONSTRAINT `service_document_requirements_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_rules` ADD CONSTRAINT `commission_rules_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `applications` ADD CONSTRAINT `applications_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `applications` ADD CONSTRAINT `applications_schemaVersionId_fkey` FOREIGN KEY (`schemaVersionId`) REFERENCES `service_schema_versions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `applications` ADD CONSTRAINT `applications_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `applications` ADD CONSTRAINT `applications_retailerId_fkey` FOREIGN KEY (`retailerId`) REFERENCES `retailer_profiles`(`userId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `applications` ADD CONSTRAINT `applications_distributorId_fkey` FOREIGN KEY (`distributorId`) REFERENCES `distributor_profiles`(`userId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `applications` ADD CONSTRAINT `applications_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `agent_profiles`(`userId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `applications` ADD CONSTRAINT `applications_assignedEmployeeId_fkey` FOREIGN KEY (`assignedEmployeeId`) REFERENCES `employee_profiles`(`userId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_status_history` ADD CONSTRAINT `application_status_history_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_documents` ADD CONSTRAINT `application_documents_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_documents` ADD CONSTRAINT `application_documents_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_documents` ADD CONSTRAINT `application_documents_requirementId_fkey` FOREIGN KEY (`requirementId`) REFERENCES `service_document_requirements`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `verification_reviews` ADD CONSTRAINT `verification_reviews_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `verification_reviews` ADD CONSTRAINT `verification_reviews_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `employee_profiles`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `applications`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_signedById_fkey` FOREIGN KEY (`signedById`) REFERENCES `employee_profiles`(`userId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_signatureAssetId_fkey` FOREIGN KEY (`signatureAssetId`) REFERENCES `signature_assets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_ownerUserId_fkey` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document_access_tokens` ADD CONSTRAINT `document_access_tokens_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `applications`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_events` ADD CONSTRAINT `payment_events_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallets` ADD CONSTRAINT `wallets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_ledger` ADD CONSTRAINT `wallet_ledger_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `wallets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fund_transfers` ADD CONSTRAINT `fund_transfers_fromWalletId_fkey` FOREIGN KEY (`fromWalletId`) REFERENCES `wallets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fund_transfers` ADD CONSTRAINT `fund_transfers_toWalletId_fkey` FOREIGN KEY (`toWalletId`) REFERENCES `wallets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_adjustment_requests` ADD CONSTRAINT `wallet_adjustment_requests_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `wallets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_entries` ADD CONSTRAINT `commission_entries_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `applications`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_entries` ADD CONSTRAINT `commission_entries_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `wallets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referral_codes` ADD CONSTRAINT `referral_codes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_referrerId_fkey` FOREIGN KEY (`referrerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_referredUserId_fkey` FOREIGN KEY (`referredUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_linkedApplicationId_fkey` FOREIGN KEY (`linkedApplicationId`) REFERENCES `applications`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_assignedEmployeeId_fkey` FOREIGN KEY (`assignedEmployeeId`) REFERENCES `employee_profiles`(`userId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_messages` ADD CONSTRAINT `ticket_messages_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `tickets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kyc_submissions` ADD CONSTRAINT `kyc_submissions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kyc_documents` ADD CONSTRAINT `kyc_documents_kycSubmissionId_fkey` FOREIGN KEY (`kycSubmissionId`) REFERENCES `kyc_submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kyc_documents` ADD CONSTRAINT `kyc_documents_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `iam_requests` ADD CONSTRAINT `iam_requests_targetUserId_fkey` FOREIGN KEY (`targetUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `anomaly_flags` ADD CONSTRAINT `anomaly_flags_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_availability` ADD CONSTRAINT `service_availability_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_availability` ADD CONSTRAINT `service_availability_districtId_fkey` FOREIGN KEY (`districtId`) REFERENCES `districts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_signature_placements` ADD CONSTRAINT `service_signature_placements_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_document_templates` ADD CONSTRAINT `service_document_templates_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_service_assignments` ADD CONSTRAINT `employee_service_assignments_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee_profiles`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_service_assignments` ADD CONSTRAINT `employee_service_assignments_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_service_assignments` ADD CONSTRAINT `employee_service_assignments_districtId_fkey` FOREIGN KEY (`districtId`) REFERENCES `districts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payout_methods` ADD CONSTRAINT `payout_methods_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payout_requests` ADD CONSTRAINT `payout_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payout_requests` ADD CONSTRAINT `payout_requests_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `wallets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payout_requests` ADD CONSTRAINT `payout_requests_methodId_fkey` FOREIGN KEY (`methodId`) REFERENCES `payout_methods`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_api_transactions` ADD CONSTRAINT `partner_api_transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consents` ADD CONSTRAINT `consents_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `data_deletion_requests` ADD CONSTRAINT `data_deletion_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- LabourSeva Helpdesk Ticket System Tables
-- Run this script to create the required tables

CREATE TABLE IF NOT EXISTS helpdesk_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reference_no VARCHAR(24) UNIQUE NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'HELPDESK',
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
  priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
  category VARCHAR(60) DEFAULT NULL,
  subject VARCHAR(200) NOT NULL,
  description TEXT,
  contact_name VARCHAR(100) DEFAULT NULL,
  contact_phone VARCHAR(20) DEFAULT NULL,
  contact_email VARCHAR(100) DEFAULT NULL,
  user_id INT DEFAULT NULL,
  assigned_employee_id INT DEFAULT NULL,
  linked_application_id INT DEFAULT NULL,
  sla_hours INT DEFAULT 72,
  resolution_note TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_assigned (assigned_employee_id),
  INDEX idx_user (user_id),
  INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS helpdesk_messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  author_type VARCHAR(20) NOT NULL DEFAULT 'CITIZEN',
  author_id INT DEFAULT NULL,
  author_name VARCHAR(100) DEFAULT NULL,
  body TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ticket (ticket_id, created_at),
  FOREIGN KEY (ticket_id) REFERENCES helpdesk_tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


SET FOREIGN_KEY_CHECKS = 1;
