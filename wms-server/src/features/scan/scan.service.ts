import {
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import {
  CargoStatus,
  Prisma,
  ScanReason,
  ScanResult,
} from '../../../generated/prisma/client.js';
import { ScanRequestDto } from './dto/scan-request.dto.js';
import { ScanResponseDto } from './dto/scan-response.dto.js';
import { ListScansQueryDto } from './dto/list-scans-query.dto.js';
import { ScanLogResponseDto } from './dto/scan-log-response.dto.js';
import { dayRange } from '../../core/utils/date-utils.js';
import { PaginatedResponseDto } from '../../core/utils/paginated-response.js';

const TX_OPTIONS = { timeout: 10_000 };

const REASON_MESSAGES: Record<ScanReason, string> = {
  NOT_FOUND: 'Código não encontrado',
  ALREADY_LOADED: 'Este volume já foi carregado',
  WRONG_CARGO: 'Este volume pertence a outra carga',
  CARGO_DEPARTED: 'A carga já foi expedida',
};

const volumeSelect = {
  id: true,
  number: true,
  loaded: true,
  loadedAt: true,
  deliveryItem: {
    select: {
      product: true,
      delivery: { select: { cargoId: true, romaneioNumber: true } },
    },
  },
} satisfies Prisma.VolumeSelect;

type VolumeLookup = Prisma.VolumeGetPayload<{ select: typeof volumeSelect }>;

@Injectable()
export class ScansService {
  private readonly logger = new Logger(ScansService.name);

  constructor(private prisma: PrismaService) {}

  // Loga como error só o que não foi decisão do próprio service (falha de banco,
  // bug, etc). HttpException já foi logada como warn onde foi lançada.
  private rethrow(error: unknown, context: string): never {
    if (!(error instanceof HttpException)) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`${context}: ${reason}`);
    }
    throw error;
  }

  // Serializa as bipagens da mesma carga. Sem o lock, dois últimos volumes
  // carregados ao mesmo tempo não enxergariam um ao outro e o endedAt ficaria em branco.
  // O lock precisa ser a primeira leitura da transação, para as seguintes já verem o commit anterior.
  private async lockCargo(
    tx: Prisma.TransactionClient,
    cargoId: number,
    actor: string,
  ) {
    const locked = await tx.$queryRaw<{ id: number }[]>`
      SELECT id FROM cargos WHERE id = ${cargoId} FOR UPDATE
    `;
    if (locked.length === 0) {
      this.logger.warn(`Carga não encontrada (actor=${actor}, id=${cargoId})`);
      throw new NotFoundException('Carga não encontrada');
    }
    return tx.cargo.findUniqueOrThrow({
      where: { id: cargoId },
      select: { id: true, status: true, endedAt: true },
    });
  }

  private async progress(tx: Prisma.TransactionClient, cargoId: number) {
    const where: Prisma.VolumeWhereInput = {
      deliveryItem: { delivery: { cargoId } },
    };
    const total = await tx.volume.count({ where });
    const loaded = await tx.volume.count({ where: { ...where, loaded: true } });
    return { total, loaded };
  }

  // Ordem de precedência: carga expedida, código inexistente, outra carga, já carregado
  private refusalReason(
    status: CargoStatus,
    volume: VolumeLookup | null,
    cargoId: number,
  ): ScanReason | null {
    if (status === CargoStatus.DEPARTED) return ScanReason.CARGO_DEPARTED;
    if (!volume) return ScanReason.NOT_FOUND;
    if (volume.deliveryItem.delivery.cargoId !== cargoId) {
      return ScanReason.WRONG_CARGO;
    }
    if (volume.loaded) return ScanReason.ALREADY_LOADED;
    return null;
  }

  private buildResponse(args: {
    result: ScanResult;
    reason: ScanReason | null;
    code: string;
    cargoId: number;
    cargoStatus: CargoStatus;
    volume: VolumeLookup | null;
    loadedAt: Date | null;
    progress: { total: number; loaded: number };
  }): ScanResponseDto {
    const { result, reason, volume, progress } = args;

    // Dados do volume só quando ele pertence à carga conferida
    const ownVolume =
      volume && volume.deliveryItem.delivery.cargoId === args.cargoId
        ? volume
        : null;

    return new ScanResponseDto({
      result,
      reason,
      message: reason
        ? REASON_MESSAGES[reason]
        : result === ScanResult.UNDO
          ? 'Carregamento desfeito'
          : 'Volume carregado',
      code: args.code,
      cargoId: args.cargoId,
      cargoStatus: args.cargoStatus,
      totalVolumes: progress.total,
      loadedVolumes: progress.loaded,
      volume: ownVolume
        ? {
            id: ownVolume.id,
            number: ownVolume.number,
            product: ownVolume.deliveryItem.product,
            romaneioNumber: ownVolume.deliveryItem.delivery.romaneioNumber,
            loaded: result !== ScanResult.UNDO,
            loadedAt: args.loadedAt,
          }
        : null,
    });
  }

  async scan(
    dto: ScanRequestDto,
    userId: number,
    actor: string,
    device: string | null = null,
  ): Promise<ScanResponseDto> {
    try {
      const response = await this.prisma.client.$transaction(async (tx) => {
        const cargo = await this.lockCargo(tx, dto.cargoId, actor);
        const volume = await tx.volume.findUnique({
          where: { code: dto.code },
          select: volumeSelect,
        });

        const reason = this.refusalReason(cargo.status, volume, cargo.id);
        const now = new Date();
        let loadedAt = volume?.loadedAt ?? null;
        let result: ScanResult;

        if (reason === null) {
          // refusalReason nulo garante que o volume existe e pertence à carga
          await tx.volume.update({
            where: { id: volume!.id },
            data: { loaded: true, loadedAt: now, loadedById: userId },
          });
          loadedAt = now;
          result = ScanResult.OK;
        } else {
          result =
            reason === ScanReason.ALREADY_LOADED
              ? ScanResult.WARNING
              : ScanResult.ERROR;
        }

        await tx.scanLog.create({
          data: {
            code: dto.code,
            result,
            reason,
            volumeId: volume?.id ?? null,
            cargoId: cargo.id,
            userId,
            device,
          },
        });

        const progress = await this.progress(tx, cargo.id);
        let cargoStatus = cargo.status;

        if (result === ScanResult.OK) {
          const data: Prisma.CargoUpdateInput = {};
          if (cargo.status === CargoStatus.OPEN) {
            data.status = CargoStatus.LOADING;
            data.startedAt = now;
            cargoStatus = CargoStatus.LOADING;
          }
          if (progress.loaded === progress.total && cargo.endedAt === null) {
            data.endedAt = now;
          }
          if (Object.keys(data).length) {
            await tx.cargo.update({ where: { id: cargo.id }, data });
          }
        }

        return this.buildResponse({
          result,
          reason,
          code: dto.code,
          cargoId: cargo.id,
          cargoStatus,
          volume,
          loadedAt,
          progress,
        });
      }, TX_OPTIONS);

      if (response.result === ScanResult.OK) {
        this.logger.log(
          `Volume carregado (actor=${actor}, cargoId=${response.cargoId}, volumeId=${response.volume?.id}, progresso=${response.loadedVolumes}/${response.totalVolumes})`,
        );
      } else {
        this.logger.warn(
          `Bipagem recusada (actor=${actor}, cargoId=${response.cargoId}, resultado=${response.result}, motivo=${response.reason})`,
        );
      }

      return response;
    } catch (error) {
      this.rethrow(
        error,
        `Falha ao registrar bipagem (actor=${actor}, cargoId=${dto.cargoId})`,
      );
    }
  }

  async undo(
    dto: ScanRequestDto,
    userId: number,
    actor: string,
    device: string | null = null,
  ): Promise<ScanResponseDto> {
    try {
      const response = await this.prisma.client.$transaction(async (tx) => {
        const cargo = await this.lockCargo(tx, dto.cargoId, actor);

        if (cargo.status === CargoStatus.DEPARTED) {
          this.logger.warn(
            `Estorno bloqueado, carga já expedida (actor=${actor}, cargoId=${cargo.id})`,
          );
          throw new ConflictException('A carga já foi expedida');
        }

        const volume = await tx.volume.findUnique({
          where: { code: dto.code },
          select: volumeSelect,
        });
        if (!volume) {
          this.logger.warn(
            `Estorno de volume inexistente (actor=${actor}, cargoId=${cargo.id})`,
          );
          throw new NotFoundException('Volume não encontrado');
        }
        if (volume.deliveryItem.delivery.cargoId !== cargo.id) {
          this.logger.warn(
            `Estorno de volume de outra carga (actor=${actor}, cargoId=${cargo.id}, volumeId=${volume.id})`,
          );
          throw new ConflictException('Este volume pertence a outra carga');
        }
        if (!volume.loaded) {
          this.logger.warn(
            `Estorno de volume não carregado (actor=${actor}, cargoId=${cargo.id}, volumeId=${volume.id})`,
          );
          throw new ConflictException('Este volume ainda não foi carregado');
        }

        await tx.volume.update({
          where: { id: volume.id },
          data: { loaded: false, loadedAt: null, loadedById: null },
        });

        await tx.scanLog.create({
          data: {
            code: dto.code,
            result: ScanResult.UNDO,
            reason: null,
            volumeId: volume.id,
            cargoId: cargo.id,
            userId,
            device,
          },
        });

        const progress = await this.progress(tx, cargo.id);

        // A carga deixou de estar completa. O status continua LOADING.
        if (cargo.endedAt !== null && progress.loaded < progress.total) {
          await tx.cargo.update({
            where: { id: cargo.id },
            data: { endedAt: null },
          });
        }

        return this.buildResponse({
          result: ScanResult.UNDO,
          reason: null,
          code: dto.code,
          cargoId: cargo.id,
          cargoStatus: cargo.status,
          volume,
          loadedAt: null,
          progress,
        });
      }, TX_OPTIONS);

      this.logger.log(
        `Carregamento desfeito (actor=${actor}, cargoId=${response.cargoId}, volumeId=${response.volume?.id}, progresso=${response.loadedVolumes}/${response.totalVolumes})`,
      );

      return response;
    } catch (error) {
      this.rethrow(
        error,
        `Falha ao desfazer bipagem (actor=${actor}, cargoId=${dto.cargoId})`,
      );
    }
  }

  async findAll(
    query: ListScansQueryDto,
    actor: string,
  ): Promise<PaginatedResponseDto<ScanLogResponseDto>> {
    try {
      const { page, limit, cargoId, result, userId, createdFrom, createdTo } =
        query;

      const where: Prisma.ScanLogWhereInput = {
        createdAt: dayRange(createdFrom, createdTo),
        ...(cargoId !== undefined ? { cargoId } : {}),
        ...(result ? { result } : {}),
        ...(userId !== undefined ? { userId } : {}),
      };

      const [items, total] = await this.prisma.client.$transaction([
        this.prisma.client.scanLog.findMany({
          where,
          include: { user: { select: { name: true } } },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.client.scanLog.count({ where }),
      ]);

      return {
        data: items.map(
          ({ user, ...log }) =>
            new ScanLogResponseDto({ ...log, userName: user.name }),
        ),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.rethrow(error, `Falha ao listar bipagens (actor=${actor})`);
    }
  }
}
