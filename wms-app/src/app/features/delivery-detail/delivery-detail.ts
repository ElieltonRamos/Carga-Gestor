import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PackingLabel, ProductLabel } from '../packing-label/pages/packing-label';
import { CargoService } from '../cargo-registration/services/cargo-registration.service';
import { Delivery } from '../cargo-registration/types/cargo-registration';

type PrintMode = 'romaneio' | 'etiquetas' | null;

@Component({
  selector: 'app-delivery-detail',
  imports: [ReactiveFormsModule, PackingLabel],
  templateUrl: './delivery-detail.html',
})
export class DeliveryDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cargoService = inject(CargoService);
  private readonly fb = inject(FormBuilder);

  cargo = this.cargoService.cargo;
  isSaving = signal(false);
  printMode = signal<PrintMode>(null);

  private cargoId = this.route.snapshot.paramMap.get('cargoId');
  private deliveryId = this.route.snapshot.paramMap.get('deliveryId');

  originalDelivery = computed(
    () => this.cargo()?.deliveries.find((d) => d.id === this.deliveryId) ?? null,
  );

  notFound = computed(() => this.cargo() === null || (!!this.cargo() && !this.originalDelivery()));

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
    const delivery = this.originalDelivery();
    if (delivery) {
      this.loadDelivery(delivery);
    }
  }

  get itemsControls() {
    return this.form.controls.items.controls;
  }

  labels = computed<ProductLabel[]>(() => {
    const delivery = this.originalDelivery();
    if (!delivery) return [];
    return delivery.items.flatMap((item) => {
      const total = item.volumeCount ?? 1;
      return Array.from({ length: total }, (_, i) => ({
        destino: delivery.client.state,
        product: item.product,
        volumeIndex: i + 1,
        volumeTotal: total,
        weight: item.weight,
        deliverySequence: delivery.sequence,
        code: item.code,
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

    const original = this.originalDelivery();
    if (!original) return;

    this.isSaving.set(true);

    const value = this.form.getRawValue();
    const delivery: Omit<Delivery, 'status'> = {
      id: original.id,
      sequence: original.sequence,
      romaneioNumber: value.romaneioNumber!,
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
      biddingNumber: value.biddingNumber || undefined,
      modality: value.modality || undefined,
      hasInstallation: value.hasInstallation ?? undefined,
      items: value.items.map((item, index) => ({
        code: item.code || undefined,
        product: item.product!,
        quantity: item.quantity!,
        volumeCount: item.volumeCount ?? undefined,
        weight: item.weight ?? undefined,
        notes: item.notes || undefined,
        loaded: original.items[index]?.loaded,
        loadedQuantity: original.items[index]?.loadedQuantity,
      })),
    };

    await this.cargoService.saveDelivery(delivery);
    this.isSaving.set(false);
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
    this.router.navigate(['/']);
  }

  private createItemGroup() {
    return this.fb.group({
      code: [''],
      product: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      volumeCount: [1, [Validators.required, Validators.min(1)]],
      weight: this.fb.control<number | null>(null),
      notes: [''],
    });
  }

  private loadDelivery(delivery: Delivery): void {
    const items = this.form.controls.items;
    while (items.length > 0) {
      items.removeAt(0);
    }
    delivery.items.forEach(() => items.push(this.createItemGroup()));

    this.form.patchValue({
      romaneioNumber: delivery.romaneioNumber,
      biddingNumber: delivery.biddingNumber ?? '',
      modality: delivery.modality ?? '',
      hasInstallation: delivery.hasInstallation ?? false,
      client: {
        name: delivery.client.name,
        document: delivery.client.document ?? '',
        address: delivery.client.address ?? '',
        neighborhood: delivery.client.neighborhood ?? '',
        city: delivery.client.city,
        state: delivery.client.state ?? '',
        zipCode: delivery.client.zipCode ?? '',
        phone: delivery.client.phone ?? '',
      },
      items: delivery.items.map((item) => ({
        code: item.code ?? '',
        product: item.product,
        quantity: item.quantity,
        volumeCount: item.volumeCount ?? 1,
        weight: item.weight ?? null,
        notes: item.notes ?? '',
      })),
    });
  }
}
