-- CreateTable
CREATE TABLE `companies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `document` VARCHAR(191) NULL,
    `settings` JSON NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'OPERATOR', 'CHECKER') NOT NULL DEFAULT 'OPERATOR',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `document` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `neighborhood` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL,
    `state` CHAR(2) NULL,
    `zip_code` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,

    UNIQUE INDEX `clients_document_key`(`document`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cargos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `load_order` VARCHAR(191) NOT NULL,
    `total_destinations` INTEGER NOT NULL,
    `status` ENUM('OPEN', 'LOADING', 'DEPARTED') NOT NULL DEFAULT 'OPEN',
    `load_date` DATE NOT NULL,
    `issue_date` DATE NOT NULL,
    `driver_name` VARCHAR(191) NULL,
    `driver_phone` VARCHAR(191) NULL,
    `truck` VARCHAR(191) NULL,
    `inspection_responsible` VARCHAR(191) NULL,
    `organization_responsible` VARCHAR(191) NULL,
    `assistant_1` VARCHAR(191) NULL,
    `loading_responsible` VARCHAR(191) NULL,
    `warehouse_keeper` VARCHAR(191) NULL,
    `romaneio_responsible` VARCHAR(191) NULL,
    `started_at` DATETIME(3) NULL,
    `ended_at` DATETIME(3) NULL,
    `departed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cargos_load_order_key`(`load_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deliveries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cargo_id` INTEGER NOT NULL,
    `client_id` INTEGER NOT NULL,
    `sequence` INTEGER NOT NULL,
    `romaneio_number` VARCHAR(191) NOT NULL,
    `bidding_number` VARCHAR(191) NULL,
    `modality` VARCHAR(191) NULL,
    `has_installation` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('GENERATED') NOT NULL DEFAULT 'GENERATED',

    UNIQUE INDEX `deliveries_romaneio_number_key`(`romaneio_number`),
    INDEX `deliveries_client_id_idx`(`client_id`),
    UNIQUE INDEX `deliveries_cargo_id_sequence_key`(`cargo_id`, `sequence`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `delivery_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `delivery_id` INTEGER NOT NULL,
    `code` VARCHAR(191) NULL,
    `product` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `volume_count` INTEGER NULL,
    `weight` DECIMAL(10, 3) NULL,
    `notes` TEXT NULL,

    INDEX `delivery_items_delivery_id_idx`(`delivery_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `volumes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `delivery_item_id` INTEGER NOT NULL,
    `number` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `loaded` BOOLEAN NOT NULL DEFAULT false,
    `loaded_at` DATETIME(3) NULL,
    `loaded_by_id` INTEGER NULL,

    UNIQUE INDEX `volumes_code_key`(`code`),
    INDEX `volumes_loaded_by_id_idx`(`loaded_by_id`),
    UNIQUE INDEX `volumes_delivery_item_id_number_key`(`delivery_item_id`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scan_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `result` ENUM('OK', 'ERROR', 'WARNING') NOT NULL,
    `volume_id` INTEGER NULL,
    `user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `scan_logs_volume_id_idx`(`volume_id`),
    INDEX `scan_logs_user_id_idx`(`user_id`),
    INDEX `scan_logs_code_idx`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_cargo_id_fkey` FOREIGN KEY (`cargo_id`) REFERENCES `cargos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_items` ADD CONSTRAINT `delivery_items_delivery_id_fkey` FOREIGN KEY (`delivery_id`) REFERENCES `deliveries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `volumes` ADD CONSTRAINT `volumes_delivery_item_id_fkey` FOREIGN KEY (`delivery_item_id`) REFERENCES `delivery_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `volumes` ADD CONSTRAINT `volumes_loaded_by_id_fkey` FOREIGN KEY (`loaded_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scan_logs` ADD CONSTRAINT `scan_logs_volume_id_fkey` FOREIGN KEY (`volume_id`) REFERENCES `volumes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scan_logs` ADD CONSTRAINT `scan_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
