import { Module } from '@nestjs/common';
import { SummaryService } from './summary.service';
import { ReportsService } from './reports.service';
import { SummaryController } from './summary.controller';

@Module({
  controllers: [SummaryController],
  providers: [SummaryService, ReportsService],
})
export class SummaryModule {}
