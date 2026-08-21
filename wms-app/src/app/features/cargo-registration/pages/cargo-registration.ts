import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Delivery } from '../types/cargo-registration';
import { CargoService } from '../services/cargo-registration.service';

type Phase = 'config' | 'wizard' | 'done';

@Component({
  selector: 'app-cargo-registration',
  imports: [ReactiveFormsModule],
  templateUrl: './cargo-registration.html',
})
export class CargoRegistration {
  private readonly cargoService = inject(CargoService);
  private readonly fb = inject(FormBuilder);

  readonly steps = ['Configuração Inicial', 'Entregas', 'Resumo Final'];

  phase = signal<Phase>('config');
  currentIndex = signal(0);
  isSaving = signal(false);
  printingDelivery = signal<Delivery | null>(null);

  cargo = this.cargoService.cargo;

  cargoConfigForm = this.fb.group({
    totalDestinations: [1, [Validators.required, Validators.min(1)]],
    loadOrder: ['', Validators.required],
    loadDate: ['', Validators.required],
    driverName: [''],
    driverPhone: [''],
    truck: [''],
    inspectionResponsible: [''],
    organizationResponsible: [''],
    assistant1: [''],
  });

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

  totalDestinations = computed(() => this.cargo()?.totalDestinations ?? 0);

  currentStepIndex = computed(() => {
    if (this.phase() === 'config') return 0;
    if (this.phase() === 'wizard') return 1;
    return 2;
  });

  progress = computed(() => ((this.currentStepIndex() + 1) / this.steps.length) * 100);

  async startCargo(): Promise<void> {
    if (this.cargoConfigForm.invalid) {
      this.cargoConfigForm.markAllAsTouched();
      return;
    }

    const value = this.cargoConfigForm.getRawValue();

    await this.cargoService.createCargo({
      totalDestinations: value.totalDestinations!,
      loadOrder: value.loadOrder!,
      loadDate: value.loadDate!,
      driverName: value.driverName || undefined,
      driverPhone: value.driverPhone || undefined,
      truck: value.truck || undefined,
      inspectionResponsible: value.inspectionResponsible || undefined,
      organizationResponsible: value.organizationResponsible || undefined,
      assistant1: value.assistant1 || undefined,
    });

    this.phase.set('wizard');
    this.currentIndex.set(0);
    this.resetDeliveryForm();
  }

  async confirmDelivery(): Promise<void> {
    if (this.deliveryForm.invalid) {
      this.deliveryForm.markAllAsTouched();
      return;
    }

    const cargo = this.cargo();
    if (!cargo) return;

    this.isSaving.set(true);

    const value = this.deliveryForm.getRawValue();
    const delivery: Omit<Delivery, 'status'> = {
      id: `${cargo.id}-${this.currentIndex() + 1}`,
      sequence: this.currentIndex() + 1,
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
      items: value.items.map((item) => ({
        code: item.code || undefined,
        product: item.product!,
        quantity: item.quantity!,
        volumeCount: item.volumeCount ?? undefined,
        weight: item.weight ?? undefined,
        notes: item.notes || undefined,
      })),
    };

    await this.cargoService.saveDelivery(delivery);

    this.isSaving.set(false);

    const nextIndex = this.currentIndex() + 1;
    if (nextIndex >= this.totalDestinations()) {
      this.phase.set('done');
      return;
    }

    this.currentIndex.set(nextIndex);
    this.resetDeliveryForm();
  }

  addItem(): void {
    this.deliveryForm.controls.items.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    if (this.deliveryForm.controls.items.length > 1) {
      this.deliveryForm.controls.items.removeAt(index);
    }
  }

  regenerateRomaneioNumber(): void {
    this.deliveryForm.controls.romaneioNumber.setValue(this.cargoService.generateRomaneioNumber());
  }

  printDeliveryRomaneio(delivery: Delivery): void {
    this.printingDelivery.set(delivery);
    setTimeout(() => window.print(), 0);
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

  private resetDeliveryForm(): void {
    const items = this.deliveryForm.controls.items;
    while (items.length > 0) {
      items.removeAt(0);
    }
    items.push(this.createItemGroup());

    this.deliveryForm.patchValue({
      romaneioNumber: this.cargoService.generateRomaneioNumber(),
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
}
