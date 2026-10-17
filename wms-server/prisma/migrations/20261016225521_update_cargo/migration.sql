-- AlterTable
ALTER TABLE `cargos` ADD COLUMN `departed_by_id` INTEGER NULL,
    ADD COLUMN `pending_at_departure` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `cargos` ADD CONSTRAINT `cargos_departed_by_id_fkey` FOREIGN KEY (`departed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
