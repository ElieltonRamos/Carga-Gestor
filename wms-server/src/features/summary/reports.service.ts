import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { SummaryQueryDto } from './dto/summary-query.dto';
import { resolveRange } from './summary-range';

type ScanCounts = {
  ok: number;
  error: number;
  warning: number;
  undo: number;
  total: number;
};
type ResultKey = 'OK' | 'ERROR' | 'WARNING' | 'UNDO';

const RESULT_FIELD: Record<ResultKey, keyof Omit<ScanCounts, 'total'>> = {
  OK: 'ok',
  ERROR: 'error',
  WARNING: 'warning',
  UNDO: 'undo',
};

const emptyCounts = (): ScanCounts => ({
  ok: 0,
  error: 0,
  warning: 0,
  undo: 0,
  total: 0,
});

const addCount = (counts: ScanCounts, result: ResultKey, n: number) => {
  counts[RESULT_FIELD[result]] += n;
  counts.total += n;
};

const seconds = (a: Date, b: Date) =>
  Math.round((b.getTime() - a.getTime()) / 1000);

const average = (xs: number[]) =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;

type Tally = { volumes: number; weight: number; deliveries: number };

const topTally = (map: Map<string, Tally>, limit = 10) =>
  [...map.entries()]
    .map(([label, t]) => ({ label, ...t }))
    .sort((a, b) => b.volumes - a.volumes)
    .slice(0, limit);

const topCount = (rows: { label: string | null; count: number }[]) =>
  rows.sort((a, b) => b.count - a.count);

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async reports(query: SummaryQueryDto) {
    const { from, to, gte, lte } = resolveRange(query);
    const cargoWhere = { createdAt: { gte, lte } };
    const scanWhere = { createdAt: { gte, lte } };
    const db = this.prisma.client;

    const [
      scansGrouped,
      loadedByUser,
      timedCargos,
      pendingCargos,
      byDriver,
      byTruck,
      deliveries,
      byDayRows,
      byHourRows,
    ] = await Promise.all([
      db.scanLog.groupBy({
        by: ['userId', 'device', 'result'],
        where: scanWhere,
        _count: { _all: true },
      }),
      db.volume.groupBy({
        by: ['loadedById'],
        where: { loaded: true, loadedAt: { gte, lte } },
        _count: { _all: true },
      }),
      db.cargo.findMany({
        where: { ...cargoWhere, startedAt: { not: null } },
        select: {
          loadOrder: true,
          startedAt: true,
          endedAt: true,
          departedAt: true,
        },
      }),
      db.cargo.findMany({
        where: {
          ...cargoWhere,
          status: 'DEPARTED',
          pendingAtDeparture: { gt: 0 },
        },
        orderBy: { pendingAtDeparture: 'desc' },
        take: 10,
        select: {
          id: true,
          loadOrder: true,
          pendingAtDeparture: true,
          departedAt: true,
          driverName: true,
          truck: true,
        },
      }),
      db.cargo.groupBy({
        by: ['driverName'],
        where: cargoWhere,
        _count: { _all: true },
      }),
      db.cargo.groupBy({
        by: ['truck'],
        where: cargoWhere,
        _count: { _all: true },
      }),
      db.delivery.findMany({
        where: { cargo: cargoWhere },
        select: {
          clientName: true,
          clientCity: true,
          items: {
            select: { weight: true, _count: { select: { volumes: true } } },
          },
        },
      }),
      // created_at é gravado em UTC pelo Prisma; converte para -03:00
      db.$queryRaw<{ day: string; result: string; total: bigint }[]>`
        SELECT DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '-03:00'), '%Y-%m-%d') AS day,
               result, COUNT(*) AS total
        FROM scan_logs
        WHERE created_at BETWEEN ${gte} AND ${lte}
        GROUP BY day, result
        ORDER BY day`,
      db.$queryRaw<{ hour: number; total: bigint }[]>`
        SELECT HOUR(CONVERT_TZ(created_at, '+00:00', '-03:00')) AS hour,
               COUNT(*) AS total
        FROM scan_logs
        WHERE created_at BETWEEN ${gte} AND ${lte}
        GROUP BY hour
        ORDER BY hour`,
    ]);

    // Operadores + erros por usuário/dispositivo
    const byUser = new Map<number, ScanCounts>();
    const byDevice = new Map<string | null, ScanCounts>();
    for (const r of scansGrouped) {
      const n = r._count._all;
      const result = r.result;
      if (!byUser.has(r.userId)) byUser.set(r.userId, emptyCounts());
      addCount(byUser.get(r.userId)!, result, n);
      if (!byDevice.has(r.device)) byDevice.set(r.device, emptyCounts());
      addCount(byDevice.get(r.device)!, result, n);
    }

    const loadedMap = new Map<number, number>();
    for (const r of loadedByUser) {
      if (r.loadedById !== null) loadedMap.set(r.loadedById, r._count._all);
    }

    const userIds = [...new Set([...byUser.keys(), ...loadedMap.keys()])];
    const users = userIds.length
      ? await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        })
      : [];
    const userName = new Map(users.map((u) => [u.id, u.name]));

    const operators = userIds
      .map((userId) => ({
        userId,
        name: userName.get(userId) ?? null,
        volumesLoaded: loadedMap.get(userId) ?? 0,
        scans: byUser.get(userId) ?? emptyCounts(),
      }))
      .sort((a, b) => b.volumesLoaded - a.volumesLoaded);

    const devices = [...byDevice.entries()]
      .map(([device, scans]) => ({ device, scans }))
      .sort((a, b) => b.scans.total - a.scans.total);

    // Tempo de carregamento
    const loadTimes = timedCargos
      .filter((c) => c.endedAt)
      .map((c) => ({
        loadOrder: c.loadOrder,
        seconds: seconds(c.startedAt!, c.endedAt!),
      }));
    const departTimes = timedCargos
      .filter((c) => c.departedAt)
      .map((c) => seconds(c.startedAt!, c.departedAt!));
    const longest = loadTimes.reduce<(typeof loadTimes)[number] | null>(
      (max, c) => (!max || c.seconds > max.seconds ? c : max),
      null,
    );

    // Volumes e peso por cliente/cidade
    const byClient = new Map<string, Tally>();
    const byCity = new Map<string, Tally>();
    const tally = (
      map: Map<string, Tally>,
      key: string,
      volumes: number,
      weight: number,
    ) => {
      const t = map.get(key) ?? { volumes: 0, weight: 0, deliveries: 0 };
      t.volumes += volumes;
      t.weight += weight;
      t.deliveries += 1;
      map.set(key, t);
    };
    for (const d of deliveries) {
      const volumes = d.items.reduce((a, i) => a + i._count.volumes, 0);
      const weight = d.items.reduce(
        (a, i) => a + (i.weight?.toNumber() ?? 0),
        0,
      );
      tally(byClient, d.clientName, volumes, weight);
      tally(byCity, d.clientCity, volumes, weight);
    }

    // Bipagens por dia / hora
    const dayMap = new Map<string, ScanCounts>();
    for (const r of byDayRows) {
      if (!dayMap.has(r.day)) dayMap.set(r.day, emptyCounts());
      addCount(dayMap.get(r.day)!, r.result as ResultKey, Number(r.total));
    }
    const hourTotals = new Map(
      byHourRows.map((r) => [Number(r.hour), Number(r.total)]),
    );

    return {
      period: { from, to },
      operators,
      devices,
      loadingTime: {
        cargos: timedCargos.length,
        avgLoadSeconds: average(loadTimes.map((c) => c.seconds)),
        avgToDepartSeconds: average(departTimes),
        longestLoad: longest,
      },
      departedWithPending: pendingCargos,
      scansByDay: [...dayMap.entries()].map(([day, scans]) => ({
        day,
        ...scans,
      })),
      scansByHour: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        total: hourTotals.get(hour) ?? 0,
      })),
      cargosByDriver: topCount(
        byDriver.map((r) => ({ label: r.driverName, count: r._count._all })),
      ),
      cargosByTruck: topCount(
        byTruck.map((r) => ({ label: r.truck, count: r._count._all })),
      ),
      byClient: topTally(byClient),
      byCity: topTally(byCity),
    };
  }
}
