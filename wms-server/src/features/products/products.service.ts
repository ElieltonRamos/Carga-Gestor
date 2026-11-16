/* eslint-disable @typescript-eslint/no-base-to-string */
import {
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { Prisma, Product } from '../../../generated/prisma/client.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ListProductsQueryDto } from './dto/list-products-query.dto.js';
import { ProductResponseDto } from './dto/product-response.dto.js';
import { PaginatedResponseDto } from '../../core/utils/paginated-response.js';

const EDITABLE_FIELDS = ['name', 'weight', 'volumeCount'] as const;

// Normaliza para comparar Decimal, number e null/undefined
const norm = (value: unknown): string | null =>
  value === undefined || value === null ? null : String(value);

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private prisma: PrismaService) {}

  private rethrow(error: unknown, context: string): never {
    if (!(error instanceof HttpException)) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`${context}: ${reason}`);
    }
    throw error;
  }

  private toResponse(product: Product): ProductResponseDto {
    return new ProductResponseDto(product);
  }

  // Produto inativo é tratado como inexistente (mesmo critério de motoristas)
  private async findProduct(id: number, actor: string): Promise<Product> {
    const product = await this.prisma.client.product.findUnique({
      where: { id },
    });
    if (!product || !product.active) {
      this.logger.warn(`Produto não encontrado (actor=${actor}, id=${id})`);
      throw new NotFoundException('Produto não encontrado');
    }
    return product;
  }

  private diff(
    current: Product,
    dto: UpdateProductDto,
  ): Prisma.ProductUpdateInput {
    const changes: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      const value = dto[key];
      if (value !== undefined && norm(value) !== norm(current[key])) {
        changes[key] = value;
      }
    }
    return changes;
  }

  async findAll(
    query: ListProductsQueryDto,
    actor: string,
  ): Promise<PaginatedResponseDto<ProductResponseDto>> {
    try {
      const { page, limit, search, active } = query;

      const where: Prisma.ProductWhereInput = { active: active ?? true };
      const term = search?.trim();
      if (term) {
        const or: Prisma.ProductWhereInput[] = [{ name: { contains: term } }];
        // Termo numérico também busca pelo código (id)
        if (/^\d{1,9}$/.test(term)) or.push({ id: Number(term) });
        where.OR = or;
      }

      const [items, total] = await this.prisma.client.$transaction([
        this.prisma.client.product.findMany({
          where,
          orderBy: { name: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.client.product.count({ where }),
      ]);

      return {
        data: items.map((product) => this.toResponse(product)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.rethrow(error, `Falha ao listar produtos (actor=${actor})`);
    }
  }

  async findOne(id: number, actor: string): Promise<ProductResponseDto> {
    try {
      const product = await this.findProduct(id, actor);
      return this.toResponse(product);
    } catch (error) {
      this.rethrow(error, `Falha ao buscar produto (actor=${actor}, id=${id})`);
    }
  }

  async create(
    dto: CreateProductDto,
    actor: string,
  ): Promise<ProductResponseDto> {
    try {
      const created = await this.prisma.client.product.create({
        data: {
          name: dto.name,
          weight: dto.weight ?? null,
          volumeCount: dto.volumeCount ?? null,
        },
      });

      this.logger.log(`Produto criado (actor=${actor}, id=${created.id})`);

      return this.toResponse(created);
    } catch (error) {
      this.rethrow(error, `Falha ao criar produto (actor=${actor})`);
    }
  }

  async update(
    id: number,
    dto: UpdateProductDto,
    actor: string,
  ): Promise<ProductResponseDto> {
    try {
      const product = await this.findProduct(id, actor);

      const changes = this.diff(product, dto);
      const fields = Object.keys(changes);

      if (fields.length === 0) {
        this.logger.warn(
          `Edição do produto sem alterações (actor=${actor}, id=${id})`,
        );
        return this.toResponse(product);
      }

      const updated = await this.prisma.client.product.update({
        where: { id },
        data: changes,
      });

      // Só nomes dos campos, nunca valores
      this.logger.log(
        `Produto editado (actor=${actor}, id=${id}, campos=${fields.join(',')})`,
      );

      return this.toResponse(updated);
    } catch (error) {
      this.rethrow(error, `Falha ao editar produto (actor=${actor}, id=${id})`);
    }
  }

  async remove(id: number, actor: string): Promise<void> {
    try {
      await this.findProduct(id, actor);

      await this.prisma.client.product.update({
        where: { id },
        data: { active: false },
      });

      this.logger.warn(`Produto desativado (actor=${actor}, id=${id})`);
    } catch (error) {
      this.rethrow(
        error,
        `Falha ao desativar produto (actor=${actor}, id=${id})`,
      );
    }
  }
}
