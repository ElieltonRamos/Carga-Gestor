import {
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { Client, Prisma } from '../../../generated/prisma/client.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';
import { ListClientsQueryDto } from './dto/list-clients-query.dto.js';
import { ClientResponseDto } from './dto/client-response.dto.js';
import { PaginatedResponseDto } from '../../core/utils/paginated-response.js';

const EDITABLE_FIELDS = [
  'name',
  'document',
  'address',
  'neighborhood',
  'city',
  'state',
  'zipCode',
  'phone',
] as const;

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

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

  private toResponse(client: Client): ClientResponseDto {
    return new ClientResponseDto(client);
  }

  private async findClient(id: number, actor: string): Promise<Client> {
    const client = await this.prisma.client.client.findUnique({
      where: { id },
    });
    if (!client) {
      this.logger.warn(`Cliente não encontrado (actor=${actor}, id=${id})`);
      throw new NotFoundException('Cliente não encontrado');
    }
    return client;
  }

  // Documento é único. excludeId ignora o próprio registro na edição
  private async assertDocumentAvailable(
    document: string,
    actor: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.prisma.client.client.findUnique({
      where: { document },
      select: { id: true },
    });
    if (existing && existing.id !== excludeId) {
      this.logger.warn(
        `Documento já cadastrado para outro cliente (actor=${actor}, existenteId=${existing.id})`,
      );
      throw new ConflictException(
        'Já existe um cliente cadastrado com este documento',
      );
    }
  }

  // Só os campos enviados que realmente mudaram em relação ao registro atual
  private diff(
    current: Client,
    dto: UpdateClientDto,
  ): Prisma.ClientUpdateInput {
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
    query: ListClientsQueryDto,
    actor: string,
  ): Promise<PaginatedResponseDto<ClientResponseDto>> {
    try {
      const { page, limit, search } = query;

      const where: Prisma.ClientWhereInput = search
        ? {
            OR: [
              { name: { contains: search } },
              { document: { contains: search } },
            ],
          }
        : {};

      const [items, total] = await this.prisma.client.$transaction([
        this.prisma.client.client.findMany({
          where,
          orderBy: { name: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.client.client.count({ where }),
      ]);

      return {
        data: items.map((client) => this.toResponse(client)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.rethrow(error, `Falha ao listar clientes (actor=${actor})`);
    }
  }

  async findOne(id: number, actor: string): Promise<ClientResponseDto> {
    try {
      const client = await this.findClient(id, actor);
      return this.toResponse(client);
    } catch (error) {
      this.rethrow(error, `Falha ao buscar cliente (actor=${actor}, id=${id})`);
    }
  }

  async create(
    dto: CreateClientDto,
    actor: string,
  ): Promise<ClientResponseDto> {
    try {
      if (dto.document) {
        await this.assertDocumentAvailable(dto.document, actor);
      }

      const created = await this.prisma.client.client.create({ data: dto });

      this.logger.log(`Cliente criado (actor=${actor}, id=${created.id})`);

      return this.toResponse(created);
    } catch (error) {
      this.rethrow(error, `Falha ao criar cliente (actor=${actor})`);
    }
  }

  async update(
    id: number,
    dto: UpdateClientDto,
    actor: string,
  ): Promise<ClientResponseDto> {
    try {
      const client = await this.findClient(id, actor);

      const changes = this.diff(client, dto);
      const fields = Object.keys(changes);

      if (fields.length === 0) {
        this.logger.warn(
          `Edição do cliente sem alterações (actor=${actor}, id=${id})`,
        );
        return this.toResponse(client);
      }

      if (typeof changes.document === 'string') {
        await this.assertDocumentAvailable(changes.document, actor, id);
      }

      const updated = await this.prisma.client.client.update({
        where: { id },
        data: changes,
      });

      // Só nomes dos campos, nunca valores
      this.logger.log(
        `Cliente editado (actor=${actor}, id=${id}, campos=${fields.join(',')})`,
      );

      return this.toResponse(updated);
    } catch (error) {
      this.rethrow(error, `Falha ao editar cliente (actor=${actor}, id=${id})`);
    }
  }

  async remove(id: number, actor: string): Promise<void> {
    try {
      await this.findClient(id, actor);

      const deliveries = await this.prisma.client.delivery.count({
        where: { clientId: id },
      });
      if (deliveries > 0) {
        this.logger.warn(
          `Exclusão bloqueada, cliente com entregas vinculadas (actor=${actor}, id=${id}, entregas=${deliveries})`,
        );
        throw new ConflictException(
          'Não é possível excluir um cliente com entregas vinculadas',
        );
      }

      await this.prisma.client.client.delete({ where: { id } });

      this.logger.warn(`Cliente excluído (actor=${actor}, id=${id})`);
    } catch (error) {
      this.rethrow(
        error,
        `Falha ao excluir cliente (actor=${actor}, id=${id})`,
      );
    }
  }
}
