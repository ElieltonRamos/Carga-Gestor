-- AlterTable
ALTER TABLE `scan_logs` ADD COLUMN `cargo_id` INTEGER NULL,
    ADD COLUMN `device` VARCHAR(191) NULL,
    ADD COLUMN `reason` ENUM('NOT_FOUND', 'ALREADY_LOADED', 'WRONG_CARGO', 'CARGO_DEPARTED') NULL,
    MODIFY `result` ENUM('OK', 'ERROR', 'WARNING', 'UNDO') NOT NULL;

-- CreateIndex
CREATE INDEX `scan_logs_cargo_id_idx` ON `scan_logs`(`cargo_id`);

-- AddForeignKey
ALTER TABLE `scan_logs` ADD CONSTRAINT `scan_logs_cargo_id_fkey` FOREIGN KEY (`cargo_id`) REFERENCES `cargos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
