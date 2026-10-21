import { BadRequestException, Injectable } from '@nestjs/common';
import { SummaryQueryDto } from './dto/summary-query.dto';
import { PrismaService } from '../../core/database/prisma.service';

const TZ = 'America/Sao_Paulo';
const ymd = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);

@Injectable()
export class SummaryService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveRange({ from, to }: SummaryQueryDto) {
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

  async overview(query: SummaryQueryDto) {
    const { from, to, gte, lte } = this.resolveRange(query);

    const cargoWhere = { createdAt: { gte, lte } };
    const volumeWhere = { deliveryItem: { delivery: { cargo: cargoWhere } } };

    const [
      cargosByStatus,
      deliveries,
      totalVolumes,
      loadedVolumes,
      pendingAgg,
      scansGrouped,
    ] = await Promise.all([
      this.prisma.client.cargo.groupBy({
        by: ['status'],
        where: cargoWhere,
        _count: { _all: true },
      }),
      this.prisma.client.delivery.count({ where: { cargo: cargoWhere } }),
      this.prisma.client.volume.count({ where: volumeWhere }),
      this.prisma.client.volume.count({
        where: { ...volumeWhere, loaded: true },
      }),
      this.prisma.client.cargo.aggregate({
        where: { ...cargoWhere, status: 'DEPARTED' },
        _sum: { pendingAtDeparture: true },
      }),
      this.prisma.client.scanLog.groupBy({
        by: ['result', 'reason'],
        where: { createdAt: { gte, lte } },
        _count: { _all: true },
      }),
    ]);

    const cargoCount = (s: string) =>
      cargosByStatus.find((r) => r.status === s)?._count._all ?? 0;
    const scanCount = (result: string) =>
      scansGrouped
        .filter((r) => r.result === result)
        .reduce((a, r) => a + r._count._all, 0);

    const errorsByReason = scansGrouped
      .filter((r) => r.reason)
      .reduce<Record<string, number>>((acc, r) => {
        acc[r.reason!] = (acc[r.reason!] ?? 0) + r._count._all;
        return acc;
      }, {});

    const open = cargoCount('OPEN');
    const loading = cargoCount('LOADING');
    const departed = cargoCount('DEPARTED');

    return {
      period: { from, to },
      cargos: { total: open + loading + departed, open, loading, departed },
      deliveries,
      volumes: {
        total: totalVolumes,
        loaded: loadedVolumes,
        pending: totalVolumes - loadedVolumes,
      },
      pendingAtDeparture: pendingAgg._sum.pendingAtDeparture ?? 0,
      scans: {
        total: scansGrouped.reduce((a, r) => a + r._count._all, 0),
        ok: scanCount('OK'),
        error: scanCount('ERROR'),
        warning: scanCount('WARNING'),
        undo: scanCount('UNDO'),
        byReason: errorsByReason,
      },
    };
  }
}
