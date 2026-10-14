/*
  Warnings:

  - You are about to drop the column `document` on the `companies` table. All the data in the column will be lost.
  - Added the required column `cnpj` to the `companies` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `companies` DROP COLUMN `document`,
    ADD COLUMN `city` VARCHAR(191) NULL,
    ADD COLUMN `cnpj` VARCHAR(191) NOT NULL,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `license_key` VARCHAR(191) NULL,
    ADD COLUMN `license_token` TEXT NULL,
    ADD COLUMN `neighborhood` VARCHAR(191) NULL,
    ADD COLUMN `phone` VARCHAR(191) NULL,
    ADD COLUMN `state` CHAR(2) NULL,
    ADD COLUMN `state_registration` VARCHAR(191) NULL,
    ADD COLUMN `street` VARCHAR(191) NULL,
    ADD COLUMN `street_number` VARCHAR(191) NULL,
    ADD COLUMN `trade_name` VARCHAR(191) NULL,
    ADD COLUMN `zip_code` VARCHAR(191) NULL;
