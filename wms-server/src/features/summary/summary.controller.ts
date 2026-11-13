import { Controller, Get, Query } from '@nestjs/common';
import { SummaryService } from './summary.service';
import { ReportsService } from './reports.service';
import { SummaryQueryDto } from './dto/summary-query.dto';

@Controller('summary')
export class SummaryController {
  constructor(
    private readonly summaryService: SummaryService,
    private readonly reportsService: ReportsService,
  ) {}

  @Get()
  overview(@Query() query: SummaryQueryDto) {
    return this.summaryService.overview(query);
  }

  @Get('reports')
  reports(@Query() query: SummaryQueryDto) {
    return this.reportsService.reports(query);
  }
}
