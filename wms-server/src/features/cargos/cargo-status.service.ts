import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { CargoStatus, Prisma } from '../../../generated/prisma/client.js';
import { CargosService } from './cargos.service.js';
import { lockCargoRow } from './cargo-lock.js';
import { DepartCargoDto } from './dto/depart-cargo.dto.js';
import { ReopenCargoDto } from './dto/reopen-cargo.dto.js';
import { CargoResponseDto } from './dto/cargo-response.dto.js';

const TX_OPTIONS = { timeout: 10_000 };

@Injectable()
export class CargoStatusService {
  private readonly logger = new Logger(CargoStatusService.name);

  constructor(
    private prisma: PrismaService,
    private cargosService: CargosService,
  ) {}

  // Loga como error só o que não foi decisão do próprio service (falha de banco,
  // bug, etc). HttpException já foi logada como warn onde foi lançada.
  private rethrow(error: unknown, context: string): never {
    if (!(error instanceof HttpException)) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`${context}: ${reason}`);
    }
    throw error;
  }

  // Trava a carga e devolve o registro atual, ou 404
  private async lockedCargo(
    tx: Prisma.TransactionClient,
    id: number,
    actor: string,
  ) {
    if (!(await lockCargoRow(tx, id))) {
      this.logger.warn(`Carga não encontrada (actor=${actor}, id=${id})`);
      throw new NotFoundException('Carga não encontrada');
    }
    return tx.cargo.findUniqueOrThrow({
      where: { id },
      select: { id: true, status: true },
    });
  }

  async depart(
    id: number,
    dto: DepartCargoDto,
    userId: number,
    actor: string,
  ): Promise<CargoResponseDto> {
    try {
      const pending = await this.prisma.client.$transaction(async (tx) => {
        const cargo = await this.lockedCargo(tx, id, actor);

        if (cargo.status !== CargoStatus.LOADING) {
          this.logger.warn(
            `Expedição bloqueada, status inválido (actor=${actor}, id=${id}, status=${cargo.status})`,
          );
          throw new ConflictException(
            cargo.status === CargoStatus.DEPARTED
              ? 'A carga já foi expedida'
              : 'A carga ainda não iniciou o carregamento',
          );
        }

        const where: Prisma.VolumeWhereInput = {
          deliveryItem: { delivery: { cargoId: id } },
        };
        const total = await tx.volume.count({ where });
        const loaded = await tx.volume.count({
          where: { ...where, loaded: true },
        });
        const missing = total - loaded;

        if (loaded === 0) {
          this.logger.warn(
            `Expedição bloqueada, nenhum volume carregado (actor=${actor}, id=${id})`,
          );
          throw new ConflictException(
            'Não é possível expedir uma carga sem nenhum volume carregado',
          );
        }

        if (missing > 0 && dto.force !== true) {
          this.logger.warn(
            `Expedição bloqueada, volumes pendentes sem confirmação (actor=${actor}, id=${id}, pendentes=${missing})`,
          );
          throw new ConflictException({
            statusCode: HttpStatus.CONFLICT,
            error: 'Conflict',
            message: `${missing === 1 ? 'Falta 1 volume' : `Faltam ${missing} volumes`} para carregar. Confirme a expedição incompleta para continuar`,
            pendingVolumes: missing,
          });
        }

        await tx.cargo.update({
          where: { id },
          data: {
            status: CargoStatus.DEPARTED,
            departedAt: new Date(),
            departedById: userId,
            pendingAtDeparture: missing,
          },
        });

        return missing;
      }, TX_OPTIONS);

      this.logger.log(
        `Carga expedida (actor=${actor}, id=${id}, pendentes=${pending}, incompleta=${pending > 0})`,
      );

      return await this.cargosService.findOne(id, actor);
    } catch (error) {
      this.rethrow(error, `Falha ao expedir carga (actor=${actor}, id=${id})`);
    }
  }

  async reopen(
    id: number,
    dto: ReopenCargoDto,
    actor: string,
  ): Promise<CargoResponseDto> {
    try {
      await this.prisma.client.$transaction(async (tx) => {
        const cargo = await this.lockedCargo(tx, id, actor);

        if (cargo.status !== CargoStatus.DEPARTED) {
          this.logger.warn(
            `Reabertura bloqueada, carga não está expedida (actor=${actor}, id=${id}, status=${cargo.status})`,
          );
          throw new ConflictException(
            'Só é possível reabrir uma carga expedida',
          );
        }

        await tx.cargo.update({
          where: { id },
          data: {
            status: CargoStatus.LOADING,
            departedAt: null,
            departedById: null,
            pendingAtDeparture: null,
          },
        });
      }, TX_OPTIONS);

      // O motivo não é gravado no banco, fica só neste log
      this.logger.log(
        `Carga reaberta (actor=${actor}, id=${id}, motivo=${dto.reason})`,
      );

      return await this.cargosService.findOne(id, actor);
    } catch (error) {
      this.rethrow(error, `Falha ao reabrir carga (actor=${actor}, id=${id})`);
    }
  }
}
