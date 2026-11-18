-- DropIndex
DROP INDEX `cargos_load_order_key` ON `cargos`;

-- AlterTable
ALTER TABLE `cargos` MODIFY `load_order` VARCHAR(191) NULL;
