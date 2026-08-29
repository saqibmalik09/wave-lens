-- CreateTable
CREATE TABLE `tenants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `contact_email` VARCHAR(191) NULL,
    `bundle_id` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `client_secret_hash` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tenants_client_id_key`(`client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `filters` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `asset_ref` VARCHAR(191) NULL,
    `min_engine_version` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenant_entitled_filters` (
    `tenant_id` INTEGER NOT NULL,
    `filter_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`tenant_id`, `filter_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenant_enabled_filters` (
    `tenant_id` INTEGER NOT NULL,
    `filter_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`tenant_id`, `filter_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tenant_entitled_filters` ADD CONSTRAINT `tenant_entitled_filters_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenant_entitled_filters` ADD CONSTRAINT `tenant_entitled_filters_filter_id_fkey` FOREIGN KEY (`filter_id`) REFERENCES `filters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenant_enabled_filters` ADD CONSTRAINT `tenant_enabled_filters_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenant_enabled_filters` ADD CONSTRAINT `tenant_enabled_filters_filter_id_fkey` FOREIGN KEY (`filter_id`) REFERENCES `filters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
