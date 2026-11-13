import { BadRequestException } from '@nestjs/common';
import { SummaryQueryDto } from './dto/summary-query.dto';

const TZ = 'America/Sao_Paulo';
const ymd = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);

export function resolveRange({ from, to }: SummaryQueryDto) {
  const today = ymd(new Date());
  const fromStr = from ?? `${today.slice(0, 8)}01`;
  const toStr = to ?? today;
  if (fromStr > toStr)
    throw new BadRequestException('from não pode ser maior que to');

  // -03:00 fixo (sem horário de verão no Brasil atualmente)
  return {
    from: fromStr,
    to: toStr,
    gte: new Date(`${fromStr}T00:00:00.000-03:00`),
    lte: new Date(`${toStr}T23:59:59.999-03:00`),
  };
}
