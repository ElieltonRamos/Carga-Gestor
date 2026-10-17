import { Module } from '@nestjs/common';
import { ScansController } from './scan.controller';
import { ScansService } from './scan.service';

@Module({
  controllers: [ScansController],
  providers: [ScansService],
})
export class ScanModule {}
