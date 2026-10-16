/*
  Warnings:

  - Added the required column `client_city` to the `deliveries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `client_name` to the `deliveries` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `deliveries` DROP FOREIGN KEY `deliveries_client_id_fkey`;

-- AlterTable
ALTER TABLE `deliveries` ADD COLUMN `client_address` VARCHAR(191) NULL,
    ADD COLUMN `client_city` VARCHAR(191) NOT NULL,
    ADD COLUMN `client_document` VARCHAR(191) NULL,
    ADD COLUMN `client_name` VARCHAR(191) NOT NULL,
    ADD COLUMN `client_neighborhood` VARCHAR(191) NULL,
    ADD COLUMN `client_phone` VARCHAR(191) NULL,
    ADD COLUMN `client_state` CHAR(2) NULL,
    ADD COLUMN `client_zip_code` VARCHAR(191) NULL,
    MODIFY `client_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
