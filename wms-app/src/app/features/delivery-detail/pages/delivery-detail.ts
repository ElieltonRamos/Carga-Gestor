import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ProductLabel, PackingLabel } from '../../packing-label/pages/packing-label';
import { CargosService } from '../../cargo-overview/services/cargos.service';
import { Cargo, CargoDelivery, CargoDeliveryDto } from '../../cargo-overview/types/cargo';
import { PrintService } from '../../../core/services/print.service';
import { RomaneioPrint } from '../components/romaneio-print';
import { CompanyService } from '../../settings/services/company.service';
import { LogoStorage } from '../../settings/services/logo.service';
import { LabelCard } from '../../packing-label/components/label-card';
import { ProductSelect } from '../../../shared/components/product-select/product-select';
import { ClientSelect } from '../../../shared/components/client-select/client-select';
import { Client } from '../../../features/clients/types/client';
import { Product } from '../../../features/products/types/product';
import {
  applyProduct,
  createItemGroup,
  releaseVolumes,
  unlinkProduct,
} from '../../../shared/utils/item-form';
import { toDeliveryDto } from '../../../shared/utils/delivery-payload';
import {
  applyClient,
  createClientGroup,
  unlinkClient,
  toClientDto,
} from '../../../shared/utils/client-form';

@Component({
  selector: 'app-delivery-detail',
  imports: [ReactiveFormsModule, LabelCard, ProductSelect, ClientSelect],
  templateUrl: './delivery-detail.html',
})
export class DeliveryDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cargosService = inject(CargosService);
  private readonly fb = inject(FormBuilder);
  private readonly companyService = inject(CompanyService);
  private readonly printService = inject(PrintService);
  protected readonly logoStorage = inject(LogoStorage);
  companyName = signal('');

  loading = signal(true);
  isSaving = signal(false);
  errorMessage = signal<string | null>(null);

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
    client: createClientGroup(this.fb),
    items: this.fb.array([createItemGroup(this.fb)]),
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
    firstValueFrom(this.companyService.get())
      .then((c) => this.companyName.set(c.tradeName || c.name))
      .catch(() => undefined);
    this.logoStorage.load().catch(() => undefined);
  }

  get itemsControls() {
    return this.form.controls.items.controls;
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
    applyClient(this.form.controls.client, client);
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
        notes: item.notes ?? undefined,
        volumeIndex: i + 1,
        volumeTotal: total,
        weight: item.weight ?? undefined,
        deliverySequence: delivery.sequence,
        code: `${cargo.id}-${delivery.sequence}-${item.id}-${i + 1}`,
        clientName: delivery.clientName,
        clientAddress: delivery.clientAddress ?? undefined,
        clientNeighborhood: delivery.clientNeighborhood ?? undefined,
        clientCity: delivery.clientCity,
        clientState: delivery.clientState ?? undefined,
        clientZipCode: delivery.clientZipCode ?? undefined,
        clientPhone: delivery.clientPhone ?? undefined,
      }));
    });
  });

  addItem(): void {
    this.form.controls.items.push(createItemGroup(this.fb));
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
    const delivery = this.originalDelivery();
    if (!delivery) return;
    this.printService.print(RomaneioPrint, { delivery });
  }

  printLabels(): void {
    this.printService.print(PackingLabel, {
      labels: this.labels(),
      companyName: this.companyName(),
      logo: this.logoStorage.logo(),
    });
  }

  goBack(): void {
    this.router.navigate(['/cargas']);
  }

  // O PATCH recebe a lista completa: as demais entregas seguem inalteradas (com id, sem client)
  private buildDeliveries(cargo: Cargo, current: CargoDeliveryDto): CargoDeliveryDto[] {
    return cargo.deliveries.map((d) => (d.id === this.deliveryId ? current : toDeliveryDto(d)));
  }

  private buildCurrentDelivery(): CargoDeliveryDto {
    const value = this.form.getRawValue();
    return {
      id: this.deliveryId,
      romaneioNumber: value.romaneioNumber!,
      biddingNumber: value.biddingNumber || undefined,
      modality: value.modality || undefined,
      hasInstallation: value.hasInstallation ?? false,
      clientId: value.client.id ?? undefined,
      client: toClientDto(this.form.controls.client),
      items: value.items.map((item) => ({
        id: item.id ?? undefined,
        productId: item.productId ?? null,
        product: item.product!,
        quantity: item.quantity!,
        volumeCount: item.volumeCount ?? undefined,
        weight: item.weight ?? null,
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

  private loadDelivery(delivery: CargoDelivery): void {
    const items = this.form.controls.items;
    while (items.length > 0) {
      items.removeAt(0);
    }
    delivery.items.forEach(() => items.push(createItemGroup(this.fb)));

    this.form.patchValue({
      romaneioNumber: delivery.romaneioNumber,
      biddingNumber: delivery.biddingNumber ?? '',
      modality: delivery.modality ?? '',
      hasInstallation: delivery.hasInstallation,
      client: {
        id: delivery.clientId ?? null,
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
        productId: item.productId ?? null,
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
