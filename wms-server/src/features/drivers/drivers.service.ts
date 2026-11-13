import {
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { Driver, Prisma } from '../../../generated/prisma/client.js';
import { CreateDriverDto } from './dto/create-driver.dto.js';
import { UpdateDriverDto } from './dto/update-driver.dto.js';
import { ListDriversQueryDto } from './dto/list-drivers-query.dto.js';
import { DriverResponseDto, RatingStats } from './dto/driver-response.dto.js';
import { PaginatedResponseDto } from '../../core/utils/paginated-response.js';

const EDITABLE_FIELDS = ['name', 'phone'] as const;

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(private prisma: PrismaService) {}

  private rethrow(error: unknown, context: string): never {
    if (!(error instanceof HttpException)) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`${context}: ${reason}`);
    }
    throw error;
  }

  private toResponse(driver: Driver, stats?: RatingStats): DriverResponseDto {
    return new DriverResponseDto(driver, stats);
  }

  private async ratingStats(ids: number[]): Promise<Map<number, RatingStats>> {
    const stats = new Map<number, RatingStats>();
    if (ids.length === 0) return stats;

    const groups = await this.prisma.client.driverReview.groupBy({
      by: ['driverId'],
      where: { driverId: { in: ids } },
      _avg: { rating: true },
      _count: { _all: true },
    });
    for (const group of groups) {
      stats.set(group.driverId, {
        averageRating:
          group._avg.rating === null
            ? null
            : Math.round(group._avg.rating * 10) / 10,
        reviewCount: group._count._all,
      });
    }
    return stats;
  }

  // Motorista inativo é tratado como inexistente (mesmo critério de usuários)
  private async findDriver(id: number, actor: string): Promise<Driver> {
    const driver = await this.prisma.client.driver.findUnique({
      where: { id },
    });
    if (!driver || !driver.active) {
      this.logger.warn(`Motorista não encontrado (actor=${actor}, id=${id})`);
      throw new NotFoundException('Motorista não encontrado');
    }
    return driver;
  }

  private diff(
    current: Driver,
    dto: UpdateDriverDto,
  ): Prisma.DriverUpdateInput {
    const changes: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      const value = dto[key];
      if (value !== undefined && value !== current[key]) {
        changes[key] = value;
      }
    }
    return changes;
  }

  async findAll(
    query: ListDriversQueryDto,
    actor: string,
  ): Promise<PaginatedResponseDto<DriverResponseDto>> {
    try {
      const { page, limit, search, active } = query;

      const where: Prisma.DriverWhereInput = {
        active: active ?? true,
        ...(search ? { name: { contains: search } } : {}),
      };

      const [items, total] = await this.prisma.client.$transaction([
        this.prisma.client.driver.findMany({
          where,
          orderBy: { name: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.client.driver.count({ where }),
      ]);

      const stats = await this.ratingStats(items.map((d) => d.id));

      return {
        data: items.map((driver) =>
          this.toResponse(driver, stats.get(driver.id)),
        ),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.rethrow(error, `Falha ao listar motoristas (actor=${actor})`);
    }
  }

  async findOne(id: number, actor: string): Promise<DriverResponseDto> {
    try {
      const driver = await this.findDriver(id, actor);
      const stats = await this.ratingStats([id]);
      return this.toResponse(driver, stats.get(id));
    } catch (error) {
      this.rethrow(
        error,
        `Falha ao buscar motorista (actor=${actor}, id=${id})`,
      );
    }
  }

  async create(
    dto: CreateDriverDto,
    actor: string,
  ): Promise<DriverResponseDto> {
    try {
      const created = await this.prisma.client.driver.create({ data: dto });

      this.logger.log(`Motorista criado (actor=${actor}, id=${created.id})`);

      return this.toResponse(created);
    } catch (error) {
      this.rethrow(error, `Falha ao criar motorista (actor=${actor})`);
    }
  }

  async update(
    id: number,
    dto: UpdateDriverDto,
    actor: string,
  ): Promise<DriverResponseDto> {
    try {
      const driver = await this.findDriver(id, actor);

      const changes = this.diff(driver, dto);
      const fields = Object.keys(changes);

      if (fields.length === 0) {
        this.logger.warn(
          `Edição do motorista sem alterações (actor=${actor}, id=${id})`,
        );
        const stats = await this.ratingStats([id]);
        return this.toResponse(driver, stats.get(id));
      }

      const updated = await this.prisma.client.driver.update({
        where: { id },
        data: changes,
      });

      this.logger.log(
        `Motorista editado (actor=${actor}, id=${id}, campos=${fields.join(',')})`,
      );

      const stats = await this.ratingStats([id]);
      return this.toResponse(updated, stats.get(id));
    } catch (error) {
      this.rethrow(
        error,
        `Falha ao editar motorista (actor=${actor}, id=${id})`,
      );
    }
  }

  async remove(id: number, actor: string): Promise<void> {
    try {
      await this.findDriver(id, actor);

      await this.prisma.client.driver.update({
        where: { id },
        data: { active: false },
      });

      this.logger.warn(`Motorista desativado (actor=${actor}, id=${id})`);
    } catch (error) {
      this.rethrow(
        error,
        `Falha ao desativar motorista (actor=${actor}, id=${id})`,
      );
    }
  }
}
