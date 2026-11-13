-- CreateTable
CREATE TABLE `cargo_reopens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cargo_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cargo_reopens_cargo_id_idx`(`cargo_id`),
    INDEX `cargo_reopens_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cargo_reopens` ADD CONSTRAINT `cargo_reopens_cargo_id_fkey` FOREIGN KEY (`cargo_id`) REFERENCES `cargos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cargo_reopens` ADD CONSTRAINT `cargo_reopens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
