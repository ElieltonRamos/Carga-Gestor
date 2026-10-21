import { IsOptional, Matches } from 'class-validator';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class SummaryQueryDto {
  @IsOptional()
  @Matches(DATE_RE, { message: 'from deve estar no formato YYYY-MM-DD' }) // trocar por ValidationMessages
  from?: string;

  @IsOptional()
  @Matches(DATE_RE, { message: 'to deve estar no formato YYYY-MM-DD' })
  to?: string;
}
