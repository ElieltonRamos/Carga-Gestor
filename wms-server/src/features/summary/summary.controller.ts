import { Controller, Get, Query } from '@nestjs/common';
import { SummaryService } from './summary.service';
import { SummaryQueryDto } from './dto/summary-query.dto';

@Controller('summary')
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get()
  overview(@Query() query: SummaryQueryDto) {
    return this.summaryService.overview(query);
  }
}
