import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, exhaustMap, filter, firstValueFrom, map, of, takeWhile, timer } from 'rxjs';
import { computeVolumeProgress } from '../../shared/utils/volume-progress';
import {
  Cargo,
  CargoDelivery,
  CargoDeliveryDto,
  CargoItem,
  CargoStatus,
  UpdateCargoDto,
} from '../cargo-overview/types/cargo';
import { CargosService } from '../cargo-overview/services/cargos.service';
import { toDeliveryDto } from '../../shared/utils/delivery-payload';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type CargoAction = 'depart' | 'reopen' | 'remove';

type OptionalHeaderField =
  | 'driverName'
  | 'driverPhone'
  | 'truck'
  | 'inspectionResponsible'
  | 'organizationResponsible'
  | 'assistant1'
  | 'loadingResponsible'
  | 'warehouseKeeper'
  | 'romaneioResponsible';

const STATUS_LABEL: Record<CargoStatus, string> = {
  OPEN: 'Aberta',
  LOADING: 'Em carregamento',
  DEPARTED: 'Expedida',
};

type PollResult = { version: number; cargo: Cargo } | 'missing' | null;

@Component({
  selector: 'app-cargo-detail',
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './cargo-detail.html',
})
export class CargoDetail {
  private static readonly POLL_MS = 10_000;
  private readonly destroyRef = inject(DestroyRef);
  private cargoVersion = 0;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cargosService = inject(CargosService);
  private readonly fb = inject(FormBuilder);

  private readonly cargoId = Number(this.route.snapshot.paramMap.get('cargoId'));

  readonly optionalFields: { control: OptionalHeaderField; label: string; maxlength: number }[] = [
    { control: 'driverName', label: 'Motorista', maxlength: 191 },
    { control: 'driverPhone', label: 'Telefone motorista', maxlength: 20 },
    { control: 'truck', label: 'Caminhão', maxlength: 191 },
    { control: 'inspectionResponsible', label: 'Responsável pela conferência', maxlength: 191 },
    { control: 'organizationResponsible', label: 'Responsável pela organização', maxlength: 191 },
    { control: 'assistant1', label: 'Auxiliar 1', maxlength: 191 },
    { control: 'loadingResponsible', label: 'Responsável pelo carregamento', maxlength: 191 },
    { control: 'warehouseKeeper', label: 'Almoxarife', maxlength: 191 },
    { control: 'romaneioResponsible', label: 'Responsável pelo romaneio', maxlength: 191 },
  ];

  loading = signal(true);
  cargo = signal<Cargo | null>(null);
  expandedDeliveryId = signal<number | null>(null);

  editing = signal(false);
  action = signal<CargoAction | null>(null);
  reason = signal('');
  isActing = signal(false);
  errorMessage = signal<string | null>(null);

  editForm = this.fb.group({
    loadOrder: ['', Validators.required],
    loadDate: ['', Validators.required],
    issueDate: ['', Validators.required],
    driverName: [''],
    driverPhone: [''],
    truck: [''],
    inspectionResponsible: [''],
    organizationResponsible: [''],
    assistant1: [''],
    loadingResponsible: [''],
    warehouseKeeper: [''],
    romaneioResponsible: [''],
  });

  addingDelivery = signal(false);
  deliveryToRemove = signal<CargoDelivery | null>(null);
  deliveryError = signal<string | null>(null);

  readonly clientFields = [
    { control: 'name', label: 'Nome / Razão Social', maxlength: 191, wide: false },
    { control: 'document', label: 'CNPJ/CPF', maxlength: 18, wide: false },
    { control: 'address', label: 'Endereço', maxlength: 191, wide: true },
    { control: 'neighborhood', label: 'Bairro', maxlength: 191, wide: false },
    { control: 'city', label: 'Cidade', maxlength: 191, wide: false },
    { control: 'state', label: 'Estado', maxlength: 2, wide: false },
    { control: 'zipCode', label: 'CEP', maxlength: 9, wide: false },
    { control: 'phone', label: 'Telefone', maxlength: 20, wide: false },
  ] as const;

  deliveryForm = this.fb.group({
    romaneioNumber: ['', Validators.required],
    biddingNumber: [''],
    modality: [''],
    hasInstallation: [false],
    client: this.fb.group({
      name: ['', Validators.required],
      document: [''],
      address: [''],
      neighborhood: [''],
      city: ['', Validators.required],
      state: [''],
      zipCode: [''],
      phone: [''],
    }),
    items: this.fb.array([this.createItemGroup()]),
  });

  get itemsControls() {
    return this.deliveryForm.controls.items.controls;
  }

  notFound = computed(() => !this.loading() && this.cargo() === null);

  overall = computed(() => computeVolumeProgress(this.cargo() ?? {}));

  statusLabel = computed(() => {
    const status = this.cargo()?.status;
    return status ? STATUS_LABEL[status] : '';
  });

  pendingVolumes = computed(() => {
    const cargo = this.cargo();
    return cargo ? Math.max(0, cargo.totalVolumes - cargo.loadedVolumes) : 0;
  });

  // Regras do backend: expedir só em carregamento e com ao menos 1 volume carregado,
  // reabrir só expedida, excluir só aberta e sem volumes carregados, editar só não expedida
  canEdit = computed(() => {
    const status = this.cargo()?.status;
    return !!status && status !== 'DEPARTED';
  });
  canDepart = computed(
    () => this.cargo()?.status === 'LOADING' && (this.cargo()?.loadedVolumes ?? 0) > 0,
  );
  canReopen = computed(() => this.cargo()?.status === 'DEPARTED');
  canRemove = computed(
    () => this.cargo()?.status === 'OPEN' && (this.cargo()?.loadedVolumes ?? 0) === 0,
  );

  canConfirm = computed(() => {
    const action = this.action();
    if (action === null) return false;
    if (action !== 'reopen') return true;
    const length = this.reason().trim().length;
    return length > 0 && length <= 500;
  });

  deliveryRows = computed(() =>
    (this.cargo()?.deliveries ?? []).map((delivery) => {
      const items = delivery.items.map((item) => ({ item, progress: this.itemProgress(item) }));
      return {
        delivery,
        progress: computeVolumeProgress(delivery),
        loadedItems: items.filter((i) => i.progress.status === 'complete'),
        pendingItems: items.filter((i) => i.progress.status !== 'complete'),
      };
    }),
  );

  constructor() {
    this.fetch();
    this.startPolling();
  }

  private setCargo(cargo: Cargo): void {
    this.cargoVersion++;
    this.cargo.set(cargo);
  }

  private startPolling(): void {
    timer(CargoDetail.POLL_MS, CargoDetail.POLL_MS)
      .pipe(
        // Não consulta com a aba em segundo plano nem durante uma ação em andamento
        filter(() => !document.hidden && !this.isActing()),
        exhaustMap(() => {
          const version = this.cargoVersion;
          return this.cargosService.findOne(this.cargoId).pipe(
            map((cargo): PollResult => ({ version, cargo })),
            catchError((error: unknown) =>
              of<PollResult>(
                error instanceof HttpErrorResponse && error.status === 404 ? 'missing' : null,
              ),
            ),
          );
        }),
        takeWhile((result) => result !== 'missing', true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result === 'missing') {
          this.cargo.set(null);
          return;
        }
        // Descarta a resposta se a carga foi alterada localmente depois que ela saiu
        if (result && result.version === this.cargoVersion) this.cargo.set(result.cargo);
      });
  }

  // Mínimo 1 romaneio (o backend exige lista não vazia) e sem volumes já carregados
  canRemoveDelivery(delivery: CargoDelivery): boolean {
    const cargo = this.cargo();
    return (
      !!cargo &&
      this.canEdit() &&
      cargo.deliveries.length > 1 &&
      (delivery.loadedVolumes ?? 0) === 0
    );
  }

  openAddDelivery(): void {
    if (!this.canEdit()) return;
    this.deliveryError.set(null);
    this.deliveryToRemove.set(null);
    this.resetDeliveryForm();
    this.addingDelivery.set(true);
  }

  cancelAddDelivery(): void {
    this.deliveryError.set(null);
    this.addingDelivery.set(false);
  }

  addItem(): void {
    this.deliveryForm.controls.items.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    if (this.deliveryForm.controls.items.length > 1) {
      this.deliveryForm.controls.items.removeAt(index);
    }
  }

  async saveNewDelivery(): Promise<void> {
    if (this.deliveryForm.invalid) {
      this.deliveryForm.markAllAsTouched();
      this.deliveryError.set(
        'Preencha os campos obrigatórios do romaneio, do cliente e dos itens.',
      );
      return;
    }

    const cargo = this.cargo();
    if (!cargo) return;

    const ok = await this.sendDeliveries(cargo, [
      ...cargo.deliveries.map(toDeliveryDto),
      this.buildNewDelivery(),
    ]);
    if (ok) this.addingDelivery.set(false);
  }

  askRemoveDelivery(delivery: CargoDelivery): void {
    this.deliveryError.set(null);
    this.deliveryToRemove.set(delivery);
  }

  cancelRemoveDelivery(): void {
    this.deliveryToRemove.set(null);
  }

  async confirmRemoveDelivery(): Promise<void> {
    const cargo = this.cargo();
    const target = this.deliveryToRemove();
    if (!cargo || !target) return;

    const ok = await this.sendDeliveries(
      cargo,
      cargo.deliveries.filter((d) => d.id !== target.id).map(toDeliveryDto),
    );

    this.deliveryToRemove.set(null);
    if (ok) {
      if (this.expandedDeliveryId() === target.id) this.expandedDeliveryId.set(null);
    } else {
      // Dados locais podem estar defasados (ex.: volume bipado no intervalo)
      this.fetch();
    }
  }

  private buildNewDelivery(): CargoDeliveryDto {
    const value = this.deliveryForm.getRawValue();
    return {
      romaneioNumber: value.romaneioNumber!,
      biddingNumber: value.biddingNumber || undefined,
      modality: value.modality || undefined,
      hasInstallation: value.hasInstallation ?? false,
      client: {
        name: value.client.name!,
        document: value.client.document || undefined,
        address: value.client.address || undefined,
        neighborhood: value.client.neighborhood || undefined,
        city: value.client.city!,
        state: value.client.state || undefined,
        zipCode: value.client.zipCode || undefined,
        phone: value.client.phone || undefined,
      },
      items: value.items.map((item) => ({
        code: item.code || undefined,
        product: item.product!,
        quantity: item.quantity!,
        volumeCount: item.volumeCount ?? undefined,
        weight: item.weight ?? undefined,
        notes: item.notes || undefined,
      })),
    };
  }

  private createItemGroup() {
    return this.fb.group({
      code: [''],
      product: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      volumeCount: [1, [Validators.required, Validators.min(1), Validators.max(9999)]],
      weight: this.fb.control<number | null>(null),
      notes: [''],
    });
  }

  private resetDeliveryForm(): void {
    const items = this.deliveryForm.controls.items;
    while (items.length > 0) {
      items.removeAt(0);
    }
    items.push(this.createItemGroup());

    this.deliveryForm.patchValue({
      romaneioNumber: '',
      biddingNumber: '',
      modality: '',
      hasInstallation: false,
      client: {
        name: '',
        document: '',
        address: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
      },
    });
  }

  toggleExpand(deliveryId: number): void {
    this.expandedDeliveryId.set(this.expandedDeliveryId() === deliveryId ? null : deliveryId);
  }

  isExpanded(deliveryId: number): boolean {
    return this.expandedDeliveryId() === deliveryId;
  }

  itemProgress(item: CargoItem) {
    return computeVolumeProgress({
      totalVolumes: item.totalVolumes ?? item.volumeCount ?? 1,
      loadedVolumes: item.loadedVolumes,
    });
  }

  openEdit(): void {
    const cargo = this.cargo();
    if (!cargo || !this.canEdit()) return;

    this.action.set(null);
    this.errorMessage.set(null);
    this.editForm.reset({
      loadOrder: cargo.loadOrder,
      loadDate: cargo.loadDate.slice(0, 10),
      issueDate: cargo.issueDate.slice(0, 10),
      driverName: cargo.driverName ?? '',
      driverPhone: cargo.driverPhone ?? '',
      truck: cargo.truck ?? '',
      inspectionResponsible: cargo.inspectionResponsible ?? '',
      organizationResponsible: cargo.organizationResponsible ?? '',
      assistant1: cargo.assistant1 ?? '',
      loadingResponsible: cargo.loadingResponsible ?? '',
      warehouseKeeper: cargo.warehouseKeeper ?? '',
      romaneioResponsible: cargo.romaneioResponsible ?? '',
    });
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.errorMessage.set(null);
    this.editing.set(false);
  }

  async saveEdit(): Promise<void> {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const cargo = this.cargo();
    if (!cargo) return;

    const changes = this.buildHeaderChanges(cargo);
    if (Object.keys(changes).length === 0) {
      this.editing.set(false);
      return;
    }

    this.isActing.set(true);
    this.errorMessage.set(null);

    try {
      const updated = await firstValueFrom(this.cargosService.update(cargo.id, changes));
      this.setCargo(updated);
      this.editing.set(false);
    } catch (error) {
      this.errorMessage.set(this.extractErrorMessage(error));
    } finally {
      this.isActing.set(false);
    }
  }

  private async sendDeliveries(cargo: Cargo, deliveries: CargoDeliveryDto[]): Promise<boolean> {
    this.isActing.set(true);
    this.deliveryError.set(null);

    try {
      const updated = await firstValueFrom(this.cargosService.update(cargo.id, { deliveries }));
      this.setCargo(updated);
      return true;
    } catch (error) {
      this.deliveryError.set(this.extractErrorMessage(error));
      return false;
    } finally {
      this.isActing.set(false);
    }
  }

  openAction(action: CargoAction): void {
    this.errorMessage.set(null);
    this.reason.set('');
    this.editing.set(false);
    this.action.set(action);
  }

  cancelAction(): void {
    this.action.set(null);
    this.reason.set('');
  }

  async confirmAction(): Promise<void> {
    const action = this.action();
    const cargo = this.cargo();
    if (!action || !cargo || !this.canConfirm()) return;

    this.isActing.set(true);
    this.errorMessage.set(null);

    try {
      if (action === 'remove') {
        await firstValueFrom(this.cargosService.remove(cargo.id));
        this.router.navigate(['/cargas']);
        return;
      }

      if (action === 'depart') {
        await firstValueFrom(
          this.cargosService.depart(cargo.id, this.pendingVolumes() > 0 ? { force: true } : {}),
        );
      } else {
        await firstValueFrom(this.cargosService.reopen(cargo.id, { reason: this.reason().trim() }));
      }

      this.cancelAction();
      this.fetch();
    } catch (error) {
      this.errorMessage.set(this.extractErrorMessage(error));
      this.cancelAction();
      // Dados locais podem estar defasados (ex.: volumes bipados no intervalo)
      this.fetch();
    } finally {
      this.isActing.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/cargas']);
  }

  goToDetail(deliveryId: number): void {
    this.router.navigate(['/cargas', this.cargoId, 'entregas', deliveryId]);
  }

  // Só o que mudou, sem `deliveries`: romaneios e itens ficam intactos
  private buildHeaderChanges(cargo: Cargo): UpdateCargoDto {
    const value = this.editForm.getRawValue();
    const changes: UpdateCargoDto = {};

    const loadOrder = (value.loadOrder ?? '').trim();
    if (loadOrder !== cargo.loadOrder) changes.loadOrder = loadOrder;

    const loadDate = value.loadDate ?? '';
    if (loadDate !== cargo.loadDate.slice(0, 10)) changes.loadDate = loadDate;

    const issueDate = value.issueDate ?? '';
    if (issueDate !== cargo.issueDate.slice(0, 10)) changes.issueDate = issueDate;

    for (const { control } of this.optionalFields) {
      const next = (value[control] ?? '').trim() || null;
      if (next !== (cargo[control] ?? null)) changes[control] = next;
    }

    return changes;
  }

  private fetch(): void {
    this.cargosService.findOne(this.cargoId).subscribe({
      next: (cargo) => {
        this.setCargo(cargo);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message;
      if (Array.isArray(message)) return message.join(' · ');
      if (typeof message === 'string') return message;
    }
    return 'Não foi possível concluir a operação. Tente novamente.';
  }
}
