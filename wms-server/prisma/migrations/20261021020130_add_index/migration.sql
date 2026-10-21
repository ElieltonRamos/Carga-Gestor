-- CreateIndex
CREATE INDEX `cargos_created_at_idx` ON `cargos`(`created_at`);

-- CreateIndex
CREATE INDEX `cargos_status_created_at_idx` ON `cargos`(`status`, `created_at`);

-- CreateIndex
CREATE INDEX `scan_logs_created_at_idx` ON `scan_logs`(`created_at`);
