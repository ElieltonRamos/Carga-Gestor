/* eslint-disable @typescript-eslint/no-base-to-string */
import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { CargoStatus, Prisma } from '../../../generated/prisma/client.js';
import { CreateCargoDto } from './dto/create-cargo.dto.js';
import { UpdateCargoDto } from './dto/update-cargo.dto.js';
import { ListCargosQueryDto } from './dto/list-cargos-query.dto';
import { CargoDeliveryDto, CargoItemDto } from './dto/cargo-delivery.dto';
import { CargoResponseDto } from './dto/cargo-response.dto';
import { CargoListItemDto } from './dto/cargo-list-item.dto';
import { PaginatedResponseDto } from '../../core/utils/paginated-response.js';
import { lockCargoRow } from './cargo-lock.js';

const HEADER_FIELDS = [
  'loadDate',
  'issueDate',
  'driverName',
  'driverPhone',
  'truck',
  'inspectionResponsible',
  'organizationResponsible',
  'assistant1',
  'loadingResponsible',
  'warehouseKeeper',
  'romaneioResponsible',
] as const;

const TX_OPTIONS = { timeout: 30_000 };

const cargoInclude = {
  deliveries: {
    orderBy: { sequence: 'asc' },
    include: { items: { orderBy: { id: 'asc' } } },
  },
} satisfies Prisma.CargoInclude;

type CargoWithRelations = Prisma.CargoGetPayload<{
  include: typeof cargoInclude;
}>;
type DeliveryWithItems = CargoWithRelations['deliveries'][number];

type ClientData = {
  name: string;
  city: string;
  document?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  state?: string | null;
  zipCode?: string | null;
  phone?: string | null;
};

// Datas @db.Date são comparadas e gravadas em UTC, sem hora
const dateOnly = (value: string) => new Date(`${value}T00:00:00.000Z`);

const todayInSaoPaulo = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
    new Date(),
  );

// Normaliza para comparar valores de tipos diferentes (Decimal, Date, null/undefined)
const norm = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const changedFields = (
  next: Record<string, unknown>,
  current: Record<string, unknown>,
) => {
  const changes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(next)) {
    if (norm(value) !== norm(current[key])) changes[key] = value;
  }
  return changes;
};

const toSnapshot = (c: ClientData) => ({
  clientName: c.name,
  clientDocument: c.document ?? null,
  clientAddress: c.address ?? null,
  clientNeighborhood: c.neighborhood ?? null,
  clientCity: c.city,
  clientState: c.state ?? null,
  clientZipCode: c.zipCode ?? null,
  clientPhone: c.phone ?? null,
});

// Campos do romaneio e do item, sem o snapshot do cliente e as observações
const deliveryFields = (d: CargoDeliveryDto) => ({
  romaneioNumber: d.romaneioNumber,
  biddingNumber: d.biddingNumber ?? null,
  modality: d.modality ?? null,
  hasInstallation: d.hasInstallation ?? false,
});

const itemFields = (i: CargoItemDto) => ({
  code: i.code ?? null,
  product: i.product,
  quantity: i.quantity,
  volumeCount: i.volumeCount ?? null,
  weight: i.weight ?? null,
});

@Injectable()
export class CargosService {
  private readonly logger = new Logger(CargosService.name);

  constructor(private prisma: PrismaService) {}

  // Loga como error só o que não foi decisão do próprio service (falha de banco,
  // bug, etc). HttpException já foi logada como warn onde foi lançada.
  private rethrow(error: unknown, context: string): never {
    const mapped = this.mapUniqueError(error);
    if (!(mapped instanceof HttpException)) {
      const reason = mapped instanceof Error ? mapped.message : String(mapped);
      this.logger.error(`${context}: ${reason}`);
    }
    throw mapped;
  }

  // Cobre duas gravações simultâneas que passaram pela verificação prévia
  private mapUniqueError(error: unknown): unknown {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return error;
    }
    const target = String(error.meta?.target ?? '');
    this.logger.warn(`Violação de unicidade (target=${target})`);
    if (target.includes('load_order')) {
      return new ConflictException(
        'Já existe uma carga com esta ordem de carga',
      );
    }
    if (target.includes('romaneio_number')) {
      return new ConflictException('Já existe um romaneio com este número');
    }
    if (target.includes('document')) {
      return new ConflictException(
        'Já existe um cliente cadastrado com este documento',
      );
    }
    return new ConflictException('Já existe um registro com estes dados');
  }

  private async findCargo(
    id: number,
    actor: string,
  ): Promise<CargoWithRelations> {
    const cargo = await this.prisma.client.cargo.findUnique({
      where: { id },
      include: cargoInclude,
    });
    if (!cargo) {
      this.logger.warn(`Carga não encontrada (actor=${actor}, id=${id})`);
      throw new NotFoundException('Carga não encontrada');
    }
    return cargo;
  }

  private async volumeTotals(cargoId: number) {
    const where: Prisma.VolumeWhereInput = {
      deliveryItem: { delivery: { cargoId } },
    };
    const [total, loaded] = await Promise.all([
      this.prisma.client.volume.count({ where }),
      this.prisma.client.volume.count({ where: { ...where, loaded: true } }),
    ]);
    return { total, loaded };
  }

  private async buildDetail(
    cargo: CargoWithRelations,
  ): Promise<CargoResponseDto> {
    const { total, loaded } = await this.volumeTotals(cargo.id);
    const { deliveries, ...header } = cargo;
    return new CargoResponseDto({
      ...header,
      totalVolumes: total,
      loadedVolumes: loaded,
      deliveries: deliveries.map(({ items, ...delivery }) => ({
        ...delivery,
        items: items.map((item) => ({
          ...item,
          weight: item.weight === null ? null : item.weight.toNumber(),
        })),
      })),
    });
  }

  // loadOrder é único. excludeId ignora a própria carga na edição
  private async assertLoadOrderAvailable(
    loadOrder: string,
    actor: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.prisma.client.cargo.findUnique({
      where: { loadOrder },
      select: { id: true },
    });
    if (existing && existing.id !== excludeId) {
      this.logger.warn(
        `Ordem de carga já cadastrada (actor=${actor}, existenteId=${existing.id})`,
      );
      throw new ConflictException(
        'Já existe uma carga com esta ordem de carga',
      );
    }
  }

  // romaneioNumber é único no sistema. Na edição, ignora os romaneios da própria carga
  private async assertRomaneiosAvailable(
    numbers: string[],
    actor: string,
    cargoId?: number,
  ): Promise<void> {
    if (new Set(numbers).size !== numbers.length) {
      this.logger.warn(`Romaneios repetidos no payload (actor=${actor})`);
      throw new BadRequestException(
        'Há números de romaneio repetidos nesta carga',
      );
    }
    const existing = await this.prisma.client.delivery.findFirst({
      where: {
        romaneioNumber: { in: numbers },
        ...(cargoId !== undefined ? { cargoId: { not: cargoId } } : {}),
      },
      select: { id: true, romaneioNumber: true },
    });
    if (existing) {
      this.logger.warn(
        `Romaneio já cadastrado (actor=${actor}, existenteId=${existing.id})`,
      );
      throw new ConflictException(
        `Já existe um romaneio com o número ${existing.romaneioNumber}`,
      );
    }
  }

  private buildVolumes(
    cargoId: number,
    sequence: number,
    itemId: number,
    from: number,
    to: number,
  ): Prisma.VolumeCreateManyInput[] {
    const rows: Prisma.VolumeCreateManyInput[] = [];
    for (let number = from + 1; number <= to; number++) {
      rows.push({
        deliveryItemId: itemId,
        number,
        code: `${cargoId}-${sequence}-${itemId}-${number}`,
      });
    }
    return rows;
  }

  // Reaproveita o Client pelo documento ou cria um novo. Nunca atualiza um Client existente.
  // Sem documento não há como deduplicar: fica só o snapshot, com clientId nulo.
  private async findOrCreateClient(
    tx: Prisma.TransactionClient,
    client: ClientData,
    actor: string,
  ): Promise<number | null> {
    if (!client.document) return null;

    const existing = await tx.client.findUnique({
      where: { document: client.document },
      select: { id: true },
    });
    if (existing) return existing.id;

    const created = await tx.client.create({
      data: {
        name: client.name,
        document: client.document,
        address: client.address ?? null,
        neighborhood: client.neighborhood ?? null,
        city: client.city,
        state: client.state ?? null,
        zipCode: client.zipCode ?? null,
        phone: client.phone ?? null,
      },
    });
    this.logger.log(
      `Cliente criado a partir do romaneio (actor=${actor}, id=${created.id})`,
    );
    return created.id;
  }

  private async resolveClient(
    tx: Prisma.TransactionClient,
    dto: CargoDeliveryDto,
    actor: string,
  ) {
    if (dto.clientId !== undefined) {
      const client = await tx.client.findUnique({
        where: { id: dto.clientId },
      });
      if (!client) {
        this.logger.warn(
          `Cliente do romaneio não encontrado (actor=${actor}, clientId=${dto.clientId})`,
        );
        throw new NotFoundException('Cliente não encontrado');
      }
      return { clientId: client.id, snapshot: toSnapshot(client) };
    }
    if (!dto.client) {
      this.logger.warn(`Romaneio sem cliente informado (actor=${actor})`);
      throw new BadRequestException('Informe o cliente do romaneio');
    }
    return {
      clientId: await this.findOrCreateClient(tx, dto.client, actor),
      snapshot: toSnapshot(dto.client),
    };
  }

  private async createItem(
    tx: Prisma.TransactionClient,
    cargoId: number,
    delivery: { id: number; sequence: number },
    dto: CargoItemDto,
  ): Promise<Prisma.VolumeCreateManyInput[]> {
    const item = await tx.deliveryItem.create({
      data: {
        deliveryId: delivery.id,
        ...itemFields(dto),
        notes: dto.notes ?? null,
      },
    });
    return this.buildVolumes(
      cargoId,
      delivery.sequence,
      item.id,
      0,
      item.volumeCount ?? 1,
    );
  }

  private async createDelivery(
    tx: Prisma.TransactionClient,
    cargoId: number,
    sequence: number,
    dto: CargoDeliveryDto,
    actor: string,
  ): Promise<Prisma.VolumeCreateManyInput[]> {
    const { clientId, snapshot } = await this.resolveClient(tx, dto, actor);

    const delivery = await tx.delivery.create({
      data: {
        cargoId,
        sequence,
        clientId,
        ...deliveryFields(dto),
        ...snapshot,
      },
    });

    const volumes: Prisma.VolumeCreateManyInput[] = [];
    for (const item of dto.items) {
      volumes.push(...(await this.createItem(tx, cargoId, delivery, item)));
    }
    return volumes;
  }

  private headerChanges(
    current: CargoWithRelations,
    dto: UpdateCargoDto,
  ): Record<string, unknown> {
    const next: Record<string, unknown> = {};
    for (const key of HEADER_FIELDS) {
      const value = dto[key];
      if (value === undefined) continue;
      next[key] =
        key === 'loadDate' || key === 'issueDate'
          ? dateOnly(value as string)
          : value;
    }
    return changedFields(next, current);
  }

  // Valida que os ids enviados pertencem à carga
  private assertOwnership(
    cargo: CargoWithRelations,
    incoming: CargoDeliveryDto[],
    actor: string,
  ): void {
    for (const input of incoming) {
      if (input.id === undefined) continue;
      const current = cargo.deliveries.find((d) => d.id === input.id);
      if (!current) {
        this.logger.warn(
          `Romaneio não pertence à carga (actor=${actor}, cargoId=${cargo.id}, deliveryId=${input.id})`,
        );
        throw new BadRequestException('Romaneio não pertence a esta carga');
      }
      for (const item of input.items) {
        if (
          item.id !== undefined &&
          !current.items.some((i) => i.id === item.id)
        ) {
          this.logger.warn(
            `Item não pertence ao romaneio (actor=${actor}, deliveryId=${current.id}, itemId=${item.id})`,
          );
          throw new BadRequestException('Item não pertence a este romaneio');
        }
      }
    }
  }

  // Volumes carregados não podem ser removidos pela edição: o estorno vem antes
  private async assertNoLoadedVolumes(
    tx: Prisma.TransactionClient,
    where: Prisma.VolumeWhereInput,
    message: string,
    cargoId: number,
    actor: string,
  ): Promise<void> {
    const loaded = await tx.volume.count({ where: { ...where, loaded: true } });
    if (loaded > 0) {
      this.logger.warn(
        `Alteração bloqueada, há volumes carregados (actor=${actor}, cargoId=${cargoId}, carregados=${loaded})`,
      );
      throw new ConflictException(message);
    }
  }

  // Mantém o endedAt coerente com a estrutura: limpa se a carga deixou de estar
  // completa e preenche se passou a estar
  private async syncEndedAt(
    tx: Prisma.TransactionClient,
    cargoId: number,
    current: { status: CargoStatus; endedAt: Date | null },
    changes: Record<string, unknown>,
  ): Promise<void> {
    if (current.status !== CargoStatus.LOADING) return;

    const where: Prisma.VolumeWhereInput = {
      deliveryItem: { delivery: { cargoId } },
    };
    const total = await tx.volume.count({ where });
    const loaded = await tx.volume.count({ where: { ...where, loaded: true } });
    const complete = total > 0 && loaded === total;

    if (complete && current.endedAt === null) changes.endedAt = new Date();
    else if (!complete && current.endedAt !== null) changes.endedAt = null;
  }

  // Sincroniza romaneios e itens pelo id, preservando ids (e portanto os códigos das etiquetas)
  private async applyDeliveries(
    tx: Prisma.TransactionClient,
    cargo: CargoWithRelations,
    incoming: CargoDeliveryDto[],
    touched: Set<string>,
    actor: string,
  ): Promise<void> {
    const keptIds = new Set(
      incoming.filter((d) => d.id !== undefined).map((d) => d.id as number),
    );

    const removedIds = cargo.deliveries
      .filter((d) => !keptIds.has(d.id))
      .map((d) => d.id);
    if (removedIds.length) {
      await this.assertNoLoadedVolumes(
        tx,
        { deliveryItem: { deliveryId: { in: removedIds } } },
        'Não é possível remover um romaneio com volumes já carregados. Estorne os volumes antes',
        cargo.id,
        actor,
      );
      await tx.delivery.deleteMany({ where: { id: { in: removedIds } } });
      touched.add('romaneios');
    }

    let nextSequence =
      Math.max(0, ...cargo.deliveries.map((d) => d.sequence)) + 1;
    const newVolumes: Prisma.VolumeCreateManyInput[] = [];

    for (const input of incoming) {
      if (input.id === undefined) {
        newVolumes.push(
          ...(await this.createDelivery(
            tx,
            cargo.id,
            nextSequence++,
            input,
            actor,
          )),
        );
        touched.add('romaneios');
        continue;
      }
      const current = cargo.deliveries.find((d) => d.id === input.id)!;
      await this.updateDelivery(
        tx,
        cargo.id,
        current,
        input,
        newVolumes,
        touched,
        actor,
      );
    }

    if (newVolumes.length) {
      await tx.volume.createMany({ data: newVolumes });
      touched.add('volumes');
    }
  }

  private async updateDelivery(
    tx: Prisma.TransactionClient,
    cargoId: number,
    current: DeliveryWithItems,
    input: CargoDeliveryDto,
    newVolumes: Prisma.VolumeCreateManyInput[],
    touched: Set<string>,
    actor: string,
  ): Promise<void> {
    const data = changedFields(deliveryFields(input), current);
    if (Object.keys(data).length) touched.add('romaneios');

    // Snapshot do cliente. Só a troca do documento muda a referência (clientId).
    if (input.client) {
      const snapshot = toSnapshot(input.client);
      const snapshotChanges = changedFields(snapshot, current);
      if (Object.keys(snapshotChanges).length) {
        Object.assign(data, snapshotChanges);
        touched.add('cliente');
      }
      if (norm(snapshot.clientDocument) !== norm(current.clientDocument)) {
        data.clientId = await this.findOrCreateClient(tx, input.client, actor);
      }
    }

    const keptItemIds = new Set<number>();
    for (const item of input.items) {
      if (item.id === undefined) {
        newVolumes.push(...(await this.createItem(tx, cargoId, current, item)));
        touched.add('itens');
        continue;
      }
      keptItemIds.add(item.id);
      const currentItem = current.items.find((i) => i.id === item.id)!;

      const itemChanges = changedFields(itemFields(item), currentItem);
      if (norm(item.notes) !== norm(currentItem.notes)) {
        itemChanges.notes = item.notes ?? null;
      }
      if (Object.keys(itemChanges).length) {
        await tx.deliveryItem.update({
          where: { id: item.id },
          data: itemChanges,
        });
        touched.add('itens');
      }

      const oldTotal = currentItem.volumeCount ?? 1;
      const newTotal = item.volumeCount ?? 1;
      if (newTotal > oldTotal) {
        newVolumes.push(
          ...this.buildVolumes(
            cargoId,
            current.sequence,
            item.id,
            oldTotal,
            newTotal,
          ),
        );
      } else if (newTotal < oldTotal) {
        await this.assertNoLoadedVolumes(
          tx,
          { deliveryItemId: item.id, number: { gt: newTotal } },
          'Não é possível reduzir a quantidade de volumes com volumes já carregados. Estorne os volumes antes',
          cargoId,
          actor,
        );
        await tx.volume.deleteMany({
          where: { deliveryItemId: item.id, number: { gt: newTotal } },
        });
        touched.add('volumes');
      }
    }

    const removedItemIds = current.items
      .filter((i) => !keptItemIds.has(i.id))
      .map((i) => i.id);
    if (removedItemIds.length) {
      await this.assertNoLoadedVolumes(
        tx,
        { deliveryItemId: { in: removedItemIds } },
        'Não é possível remover um item com volumes já carregados. Estorne os volumes antes',
        cargoId,
        actor,
      );
      await tx.deliveryItem.deleteMany({
        where: { id: { in: removedItemIds } },
      });
      touched.add('itens');
    }

    if (Object.keys(data).length) {
      await tx.delivery.update({
        where: { id: current.id },
        data: data,
      });
    }
  }

  // Sem createdFrom/createdTo, filtra o dia atual (America/Sao_Paulo) pela data de criação
  private createdRange({ createdFrom, createdTo }: ListCargosQueryDto) {
    const useToday = !createdFrom && !createdTo;
    const from = createdFrom ?? (useToday ? todayInSaoPaulo() : undefined);
    const to = createdTo ?? (useToday ? todayInSaoPaulo() : undefined);
    return {
      gte: from ? new Date(`${from}T00:00:00.000-03:00`) : undefined,
      lte: to ? new Date(`${to}T23:59:59.999-03:00`) : undefined,
    };
  }

  // Uma consulta agregada para todas as cargas da página
  private async progressByCargo(cargoIds: number[]) {
    const progress = new Map<number, { total: number; loaded: number }>();
    if (cargoIds.length === 0) return progress;

    const rows = await this.prisma.client.$queryRaw<
      { cargoId: number; total: bigint; loaded: bigint | null }[]
    >`
      SELECT d.cargo_id AS cargoId,
             COUNT(v.id) AS total,
             COALESCE(SUM(v.loaded), 0) AS loaded
      FROM volumes v
      JOIN delivery_items di ON di.id = v.delivery_item_id
      JOIN deliveries d ON d.id = di.delivery_id
      WHERE d.cargo_id IN (${Prisma.join(cargoIds)})
      GROUP BY d.cargo_id
    `;
    for (const row of rows) {
      progress.set(Number(row.cargoId), {
        total: Number(row.total),
        loaded: Number(row.loaded ?? 0),
      });
    }
    return progress;
  }

  async findAll(
    query: ListCargosQueryDto,
    actor: string,
  ): Promise<PaginatedResponseDto<CargoListItemDto>> {
    try {
      const { page, limit, status, search, loadDate } = query;

      const where: Prisma.CargoWhereInput = {
        createdAt: this.createdRange(query),
        ...(status ? { status } : {}),
        ...(loadDate ? { loadDate: dateOnly(loadDate) } : {}),
        ...(search
          ? {
              OR: [
                { loadOrder: { contains: search } },
                { driverName: { contains: search } },
                { truck: { contains: search } },
              ],
            }
          : {}),
      };

      const [items, total] = await this.prisma.client.$transaction([
        this.prisma.client.cargo.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.client.cargo.count({ where }),
      ]);

      const progress = await this.progressByCargo(items.map((c) => c.id));

      return {
        data: items.map(
          (cargo) =>
            new CargoListItemDto({
              ...cargo,
              totalVolumes: progress.get(cargo.id)?.total ?? 0,
              loadedVolumes: progress.get(cargo.id)?.loaded ?? 0,
            }),
        ),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.rethrow(error, `Falha ao listar cargas (actor=${actor})`);
    }
  }

  async findOne(id: number, actor: string): Promise<CargoResponseDto> {
    try {
      const cargo = await this.findCargo(id, actor);
      return await this.buildDetail(cargo);
    } catch (error) {
      this.rethrow(error, `Falha ao buscar carga (actor=${actor}, id=${id})`);
    }
  }

  async create(dto: CreateCargoDto, actor: string): Promise<CargoResponseDto> {
    try {
      await this.assertLoadOrderAvailable(dto.loadOrder, actor);
      await this.assertRomaneiosAvailable(
        dto.deliveries.map((d) => d.romaneioNumber),
        actor,
      );

      const { cargoId, volumes } = await this.prisma.client.$transaction(
        async (tx) => {
          const cargo = await tx.cargo.create({
            data: {
              loadOrder: dto.loadOrder,
              totalDestinations: dto.deliveries.length,
              loadDate: dateOnly(dto.loadDate),
              issueDate: dateOnly(dto.issueDate),
              driverName: dto.driverName ?? null,
              driverPhone: dto.driverPhone ?? null,
              truck: dto.truck ?? null,
              inspectionResponsible: dto.inspectionResponsible ?? null,
              organizationResponsible: dto.organizationResponsible ?? null,
              assistant1: dto.assistant1 ?? null,
              loadingResponsible: dto.loadingResponsible ?? null,
              warehouseKeeper: dto.warehouseKeeper ?? null,
              romaneioResponsible: dto.romaneioResponsible ?? null,
            },
          });

          const rows: Prisma.VolumeCreateManyInput[] = [];
          for (const [index, delivery] of dto.deliveries.entries()) {
            rows.push(
              ...(await this.createDelivery(
                tx,
                cargo.id,
                index + 1,
                delivery,
                actor,
              )),
            );
          }
          if (rows.length) await tx.volume.createMany({ data: rows });

          return { cargoId: cargo.id, volumes: rows.length };
        },
        TX_OPTIONS,
      );

      this.logger.log(
        `Carga criada (actor=${actor}, id=${cargoId}, romaneios=${dto.deliveries.length}, volumes=${volumes})`,
      );

      return await this.buildDetail(await this.findCargo(cargoId, actor));
    } catch (error) {
      this.rethrow(error, `Falha ao criar carga (actor=${actor})`);
    }
  }

  async update(
    id: number,
    dto: UpdateCargoDto,
    actor: string,
  ): Promise<CargoResponseDto> {
    try {
      const cargo = await this.findCargo(id, actor);

      if (cargo.status === CargoStatus.DEPARTED) {
        this.logger.warn(
          `Edição bloqueada, carga já expedida (actor=${actor}, id=${id})`,
        );
        throw new ConflictException('Uma carga expedida não pode ser editada');
      }

      const changes = this.headerChanges(cargo, dto);

      if (dto.loadOrder !== undefined && dto.loadOrder !== cargo.loadOrder) {
        await this.assertLoadOrderAvailable(dto.loadOrder, actor, id);
        changes.loadOrder = dto.loadOrder;
      }

      if (dto.deliveries !== undefined) {
        this.assertOwnership(cargo, dto.deliveries, actor);
        await this.assertRomaneiosAvailable(
          dto.deliveries.map((d) => d.romaneioNumber),
          actor,
          id,
        );
        if (dto.deliveries.length !== cargo.totalDestinations) {
          changes.totalDestinations = dto.deliveries.length;
        }
      }

      if (dto.deliveries === undefined && Object.keys(changes).length === 0) {
        this.logger.warn(
          `Edição da carga sem alterações (actor=${actor}, id=${id})`,
        );
        return await this.buildDetail(cargo);
      }

      const touched = new Set<string>();
      const updated = await this.prisma.client.$transaction(async (tx) => {
        await lockCargoRow(tx, id);

        // Releitura após o lock: a carga pode ter sido expedida ou bipada nesse intervalo
        const fresh = await tx.cargo.findUniqueOrThrow({
          where: { id },
          select: { status: true, endedAt: true },
        });
        if (fresh.status === CargoStatus.DEPARTED) {
          this.logger.warn(
            `Edição bloqueada, carga já expedida (actor=${actor}, id=${id})`,
          );
          throw new ConflictException(
            'Uma carga expedida não pode ser editada',
          );
        }

        if (dto.deliveries !== undefined) {
          await this.applyDeliveries(tx, cargo, dto.deliveries, touched, actor);
          await this.syncEndedAt(tx, id, fresh, changes);
        }
        if (Object.keys(changes).length) {
          await tx.cargo.update({
            where: { id },
            data: changes,
          });
        }
        return tx.cargo.findUniqueOrThrow({
          where: { id },
          include: cargoInclude,
        });
      }, TX_OPTIONS);

      const fields = [...Object.keys(changes), ...touched];
      if (fields.length === 0) {
        this.logger.warn(
          `Edição da carga sem alterações (actor=${actor}, id=${id})`,
        );
      } else {
        // Só nomes dos campos, nunca valores
        this.logger.log(
          `Carga editada (actor=${actor}, id=${id}, campos=${fields.join(',')})`,
        );
      }

      return await this.buildDetail(updated);
    } catch (error) {
      this.rethrow(error, `Falha ao editar carga (actor=${actor}, id=${id})`);
    }
  }

  async remove(id: number, actor: string): Promise<void> {
    try {
      const cargo = await this.findCargo(id, actor);

      if (cargo.status !== CargoStatus.OPEN) {
        this.logger.warn(
          `Exclusão bloqueada, carga não está aberta (actor=${actor}, id=${id}, status=${cargo.status})`,
        );
        throw new ConflictException('Só é possível excluir uma carga aberta');
      }

      const { loaded } = await this.volumeTotals(id);
      if (loaded > 0) {
        this.logger.warn(
          `Exclusão bloqueada, há volumes carregados (actor=${actor}, id=${id}, carregados=${loaded})`,
        );
        throw new ConflictException(
          'Não é possível excluir uma carga com volumes já carregados',
        );
      }

      // Garante o status no próprio delete, caso a carga tenha iniciado nesse intervalo
      const { count } = await this.prisma.client.cargo.deleteMany({
        where: { id, status: CargoStatus.OPEN },
      });
      if (count === 0) {
        this.logger.warn(
          `Exclusão bloqueada, status mudou durante a operação (actor=${actor}, id=${id})`,
        );
        throw new ConflictException('Só é possível excluir uma carga aberta');
      }

      this.logger.log(`Carga excluída (actor=${actor}, id=${id})`);
    } catch (error) {
      this.rethrow(error, `Falha ao excluir carga (actor=${actor}, id=${id})`);
    }
  }
}
