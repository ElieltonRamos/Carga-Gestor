import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { PackingLabel, ProductLabel } from '../packing-label/pages/packing-label';
import { CargosService } from '../cargo-overview/services/cargos.service';
import { Cargo, CargoDelivery, CargoDeliveryDto } from '../cargo-overview/types/cargo';

type PrintMode = 'romaneio' | 'etiquetas' | null;

@Component({
  selector: 'app-delivery-detail',
  imports: [ReactiveFormsModule, PackingLabel],
  templateUrl: './delivery-detail.html',
})
export class DeliveryDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cargosService = inject(CargosService);
  private readonly fb = inject(FormBuilder);

  loading = signal(true);
  isSaving = signal(false);
  errorMessage = signal<string | null>(null);
  printMode = signal<PrintMode>(null);

  private readonly cargoId = Number(this.route.snapshot.paramMap.get('cargoId'));
  private readonly deliveryId = Number(this.route.snapshot.paramMap.get('deliveryId'));

  cargo = signal<Cargo | null>(null);

  originalDelivery = computed(
    () => this.cargo()?.deliveries.find((d) => d.id === this.deliveryId) ?? null,
  );

  notFound = computed(() => !this.loading() && !this.originalDelivery());

  isLocked = computed(() => this.cargo()?.status === 'DEPARTED');

  form = this.fb.group({
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

  constructor() {
    this.cargosService.findOne(this.cargoId).subscribe({
      next: (cargo) => {
        this.cargo.set(cargo);
        this.loading.set(false);
        const delivery = this.originalDelivery();
        if (delivery) this.loadDelivery(delivery);
      },
      error: () => this.loading.set(false),
    });
  }

  get itemsControls() {
    return this.form.controls.items.controls;
  }

  // O código de barras é o código do volume, o mesmo usado na bipagem (/api/scans)
  labels = computed<ProductLabel[]>(() => {
    const cargo = this.cargo();
    const delivery = this.originalDelivery();
    if (!cargo || !delivery) return [];
    return delivery.items.flatMap((item) => {
      const total = item.volumeCount ?? 1;
      return Array.from({ length: total }, (_, i) => ({
        destino: delivery.clientCity,
        product: item.product,
        volumeIndex: i + 1,
        volumeTotal: total,
        weight: item.weight ?? undefined,
        deliverySequence: delivery.sequence,
        code: `${cargo.id}-${delivery.sequence}-${item.id}-${i + 1}`,
      }));
    });
  });

  addItem(): void {
    this.form.controls.items.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    if (this.form.controls.items.length > 1) {
      this.form.controls.items.removeAt(index);
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const cargo = this.cargo();
    if (!cargo || !this.originalDelivery() || this.isLocked()) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);

    try {
      const updated = await firstValueFrom(
        this.cargosService.update(cargo.id, {
          deliveries: this.buildDeliveries(cargo, this.buildCurrentDelivery()),
        }),
      );
      this.cargo.set(updated);
      const delivery = this.originalDelivery();
      if (delivery) this.loadDelivery(delivery);
    } catch (error) {
      this.errorMessage.set(this.extractErrorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  printRomaneio(): void {
    this.printMode.set('romaneio');
    setTimeout(() => window.print(), 0);
  }

  printLabels(): void {
    this.printMode.set('etiquetas');
    setTimeout(() => window.print(), 0);
  }

  goBack(): void {
    this.router.navigate(['/cargas']);
  }

  // O PATCH recebe a lista completa: as demais entregas seguem inalteradas (com id, sem client)
  private buildDeliveries(cargo: Cargo, current: CargoDeliveryDto): CargoDeliveryDto[] {
    return cargo.deliveries.map((d) =>
      d.id === this.deliveryId
        ? current
        : {
            id: d.id,
            romaneioNumber: d.romaneioNumber,
            biddingNumber: d.biddingNumber,
            modality: d.modality,
            hasInstallation: d.hasInstallation,
            items: d.items.map((i) => ({
              id: i.id,
              code: i.code,
              product: i.product,
              quantity: i.quantity,
              volumeCount: i.volumeCount,
              weight: i.weight,
              notes: i.notes,
            })),
          },
    );
  }

  private buildCurrentDelivery(): CargoDeliveryDto {
    const value = this.form.getRawValue();
    return {
      id: this.deliveryId,
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
        id: item.id ?? undefined,
        code: item.code || undefined,
        product: item.product!,
        quantity: item.quantity!,
        volumeCount: item.volumeCount ?? undefined,
        weight: item.weight ?? undefined,
        notes: item.notes || undefined,
      })),
    };
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message;
      if (Array.isArray(message)) return message.join(' · ');
      if (typeof message === 'string') return message;
    }
    return 'Não foi possível salvar as alterações. Tente novamente.';
  }

  private createItemGroup() {
    return this.fb.group({
      id: this.fb.control<number | null>(null),
      code: [''],
      product: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      volumeCount: [1, [Validators.required, Validators.min(1)]],
      weight: this.fb.control<number | null>(null),
      notes: [''],
    });
  }

  private loadDelivery(delivery: CargoDelivery): void {
    const items = this.form.controls.items;
    while (items.length > 0) {
      items.removeAt(0);
    }
    delivery.items.forEach(() => items.push(this.createItemGroup()));

    this.form.patchValue({
      romaneioNumber: delivery.romaneioNumber,
      biddingNumber: delivery.biddingNumber ?? '',
      modality: delivery.modality ?? '',
      hasInstallation: delivery.hasInstallation,
      client: {
        name: delivery.clientName,
        document: delivery.clientDocument ?? '',
        address: delivery.clientAddress ?? '',
        neighborhood: delivery.clientNeighborhood ?? '',
        city: delivery.clientCity,
        state: delivery.clientState ?? '',
        zipCode: delivery.clientZipCode ?? '',
        phone: delivery.clientPhone ?? '',
      },
      items: delivery.items.map((item) => ({
        id: item.id,
        code: item.code ?? '',
        product: item.product,
        quantity: item.quantity,
        volumeCount: item.volumeCount ?? 1,
        weight: item.weight ?? null,
        notes: item.notes ?? '',
      })),
    });

    if (this.isLocked()) this.form.disable();
    else this.form.enable();
  }
}