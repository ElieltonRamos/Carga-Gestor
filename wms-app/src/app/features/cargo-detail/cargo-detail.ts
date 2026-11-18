import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  catchError,
  exhaustMap,
  filter,
  firstValueFrom,
  map,
  of,
  takeWhile,
  timer,
  switchMap,
  tap,
} from 'rxjs';
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
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { DriverSelect } from '../../shared/components/driver-select/driver-select';
import { ClientSelect } from '../../shared/components/client-select/client-select';
import { Client } from '../../features/clients/types/client';
import { Driver } from '../../features/drivers/types/driver';
import { DriversService } from '../../features/drivers/services/drivers.service';
import { DriverReview } from '../../features/drivers/types/driver-review';
import { ProductSelect } from '../../shared/components/product-select/product-select';
import { Product } from '../../features/products/types/product';
import {
  applyProduct,
  createItemGroup,
  releaseVolumes,
  unlinkProduct,
} from '../../shared/utils/item-form';
import {
  applyClient,
  createClientGroup,
  unlinkClient,
  toClientDto,
} from '../../shared/utils/client-form';

type CargoAction = 'depart' | 'reopen' | 'remove';

type OptionalHeaderField =
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
  imports: [DatePipe, ReactiveFormsModule, DriverSelect, ProductSelect, ClientSelect],
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
  private readonly driversService = inject(DriversService);

  private readonly cargoId = Number(this.route.snapshot.paramMap.get('cargoId'));

  readonly optionalFields: { control: OptionalHeaderField; label: string; maxlength: number }[] = [
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
    loadOrder: [''],
    loadDate: ['', Validators.required],
    issueDate: ['', Validators.required],
    driverId: [null as number | null],
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
    biddingNumber: [''],
    modality: [''],
    hasInstallation: [false],
    client: createClientGroup(this.fb),
    items: this.fb.array([createItemGroup(this.fb)]),
  });

  get itemsControls() {
    return this.deliveryForm.controls.items.controls;
  }

  onProductSelected(index: number, product: Product): void {
    applyProduct(this.itemsControls[index], product);
  }

  onProductNameChanged(index: number, name: string): void {
    unlinkProduct(this.itemsControls[index], name);
  }

  onVolumesInput(index: number): void {
    releaseVolumes(this.itemsControls[index]);
  }

  onClientSelected(client: Client): void {
    applyClient(this.deliveryForm.controls.client, client);
  }

  onClientFieldInput(control: string): void {
    if (control === 'name' || control === 'document') {
      unlinkClient(this.deliveryForm.controls.client);
    }
  }

  onClientUnlink(): void {
    unlinkClient(this.deliveryForm.controls.client);
  }

  readonly stars = [1, 2, 3, 4, 5];

  // Só carga expedida com motorista vinculado pode ser avaliada
  readonly reviewKey = computed(
    () => {
      const cargo = this.cargo();
      return cargo && cargo.status === 'DEPARTED' && cargo.driverId !== null
        ? { cargoId: cargo.id, driverId: cargo.driverId }
        : null;
    },
    { equal: (a, b) => a?.cargoId === b?.cargoId && a?.driverId === b?.driverId },
  );

  existingReview = signal<DriverReview | null>(null);
  reviewReady = signal(false);
  reviewing = signal(false);
  savingReview = signal(false);
  reviewError = signal<string | null>(null);

  canReview = computed(
    () => !!this.reviewKey() && this.reviewReady() && this.existingReview() === null,
  );

  reviewForm = this.fb.group({
    rating: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(5),
    ]),
    comment: ['', Validators.maxLength(1000)],
  });

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

    toObservable(this.reviewKey)
      .pipe(
        tap(() => this.reviewReady.set(false)),
        switchMap((key) =>
          key
            ? this.driversService
                .findReviews(key.driverId, { page: 1, limit: 1, cargoId: key.cargoId })
                .pipe(
                  map((page) => page.data[0] ?? null),
                  catchError(() => of(undefined)),
                )
            : of(null),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((review) => {
        this.existingReview.set(review ?? null);
        // Falha na consulta: esconde a ação em vez de arriscar uma avaliação duplicada
        this.reviewReady.set(review !== undefined);
      });
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
    this.deliveryForm.controls.items.push(createItemGroup(this.fb));
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
      biddingNumber: value.biddingNumber || undefined,
      modality: value.modality || undefined,
      hasInstallation: value.hasInstallation ?? false,
      clientId: value.client.id ?? undefined,
      client: toClientDto(this.deliveryForm.controls.client),
      items: value.items.map((item) => ({
        productId: item.productId ?? undefined,
        product: item.product!,
        quantity: item.quantity!,
        volumeCount: item.volumeCount ?? undefined,
        weight: item.weight ?? null,
        notes: item.notes || undefined,
      })),
    };
  }

  private resetDeliveryForm(): void {
    const items = this.deliveryForm.controls.items;
    while (items.length > 0) {
      items.removeAt(0);
    }
    items.push(createItemGroup(this.fb));

    this.deliveryForm.patchValue({
      biddingNumber: '',
      modality: '',
      hasInstallation: false,
      client: {
        id: null,
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

  openReview(): void {
    this.reviewError.set(null);
    this.reviewForm.reset({ rating: null, comment: '' });
    this.reviewing.set(true);
  }

  cancelReview(): void {
    this.reviewing.set(false);
  }

  setRating(value: number): void {
    this.reviewForm.controls.rating.setValue(value);
    this.reviewForm.controls.rating.markAsTouched();
  }

  async saveReview(): Promise<void> {
    const key = this.reviewKey();
    if (!key) return;
    if (this.reviewForm.invalid) {
      this.reviewForm.markAllAsTouched();
      return;
    }

    const { rating, comment } = this.reviewForm.getRawValue();
    this.savingReview.set(true);
    this.reviewError.set(null);

    try {
      const review = await firstValueFrom(
        this.driversService.createReview(key.driverId, {
          rating: rating!,
          cargoId: key.cargoId,
          comment: (comment ?? '').trim() || null,
        }),
      );
      this.existingReview.set(review);
      this.reviewing.set(false);
    } catch (error) {
      this.reviewError.set(this.extractErrorMessage(error));
    } finally {
      this.savingReview.set(false);
    }
  }

  openEdit(): void {
    const cargo = this.cargo();
    if (!cargo || !this.canEdit()) return;

    this.action.set(null);
    this.errorMessage.set(null);
    this.editForm.reset({
      loadOrder: cargo.loadOrder ?? '',
      loadDate: cargo.loadDate.slice(0, 10),
      issueDate: cargo.issueDate.slice(0, 10),
      driverId: cargo.driverId ?? null,
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

  onDriverSelected(driver: Driver | null): void {
    this.editForm.patchValue({
      driverId: driver?.id ?? null,
      driverName: driver?.name ?? '',
      driverPhone: driver?.phone ?? '',
    });
  }

  onDriverNameChanged(name: string): void {
    this.editForm.patchValue({ driverId: null, driverName: name });
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

    const loadOrder = (value.loadOrder ?? '').trim() || null;
    if (loadOrder !== (cargo.loadOrder ?? null)) changes.loadOrder = loadOrder;

    const loadDate = value.loadDate ?? '';
    if (loadDate !== cargo.loadDate.slice(0, 10)) changes.loadDate = loadDate;

    const issueDate = value.issueDate ?? '';
    if (issueDate !== cargo.issueDate.slice(0, 10)) changes.issueDate = issueDate;

    // driverId - only send if changed (normalize undefined to null)
    if ((value.driverId ?? null) !== (cargo.driverId ?? null)) {
      changes.driverId = value.driverId ?? null;
    }

    // driverName and driverPhone - send if changed (not in optionalFields anymore)
    const nextDriverName = (value.driverName ?? '').trim() || null;
    if (nextDriverName !== (cargo.driverName ?? null)) changes.driverName = nextDriverName;

    const nextDriverPhone = (value.driverPhone ?? '').trim() || null;
    if (nextDriverPhone !== (cargo.driverPhone ?? null)) changes.driverPhone = nextDriverPhone;

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
