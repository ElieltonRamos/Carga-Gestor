import { Module } from '@nestjs/common';
import { CargosService } from './cargos.service';
import { CargosController } from './cargos.controller';
import { CargoStatusService } from './cargo-status.service';

@Module({
  controllers: [CargosController],
  providers: [CargosService, CargoStatusService],
})
export class CargosModule {}
