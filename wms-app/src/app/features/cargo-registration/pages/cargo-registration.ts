import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Cargo, CargoDelivery, CargoDeliveryDto, CreateCargoDto } from '../../cargo-overview/types/cargo';
import { CargosService } from '../../cargo-overview/services/cargos.service';

type Phase = 'config' | 'wizard' | 'done';
type CargoConfig = Omit<CreateCargoDto, 'deliveries'> & { totalDestinations: number };

interface SummaryRow {
  key: string | number;
  romaneioNumber: string;
  clientName: string;
  clientCity: string;
  itemsCount: number;
  delivery: CargoDelivery | null;
}

const todayInSaoPaulo = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

@Component({
  selector: 'app-cargo-registration',
  imports: [ReactiveFormsModule],
  templateUrl: './cargo-registration.html',
})
export class CargoRegistration {
  private readonly cargosService = inject(CargosService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly steps = ['Configuração Inicial', 'Entregas', 'Resumo Final'];

  phase = signal<Phase>('config');
  currentIndex = signal(0);
  isSaving = signal(false);
  errorMessage = signal<string | null>(null);
  configError = signal<string | null>(null);
  printingDelivery = signal<CargoDelivery | null>(null);

  private config = signal<CargoConfig | null>(null);
  private drafts = signal<CargoDeliveryDto[]>([]);
  cargo = signal<Cargo | null>(null);

  isResuming = computed(() => this.config() !== null);

  cargoConfigForm = this.fb.group({
    totalDestinations: [1, [Validators.required, Validators.min(1)]],
    loadOrder: ['', Validators.required],
    loadDate: ['', Validators.required],
    issueDate: [todayInSaoPaulo(), Validators.required],
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

  totalDestinations = computed(() => this.config()?.totalDestinations ?? 0);

  isLastStep = computed(() => this.currentIndex() + 1 >= this.totalDestinations());

  currentStepIndex = computed(() => {
    if (this.phase() === 'config') return 0;
    if (this.phase() === 'wizard') return 1;
    return 2;
  });

  progress = computed(() => ((this.currentStepIndex() + 1) / this.steps.length) * 100);

  summaryRows = computed<SummaryRow[]>(() => {
    const saved = this.cargo()?.deliveries;
    if (saved) {
      return saved.map((d: any) => ({
        key: d.id,
        romaneioNumber: d.romaneioNumber,
        clientName: d.clientName,
        clientCity: d.clientCity,
        itemsCount: d.items.length,
        delivery: d,
      }));
    }
    return this.drafts().map((d, i) => ({
      key: `draft-${i}`,
      romaneioNumber: d.romaneioNumber,
      clientName: d.client?.name ?? '',
      clientCity: d.client?.city ?? '',
      itemsCount: d.items.length,
      delivery: null,
    }));
  });

  startCargo(): void {
    if (this.cargoConfigForm.invalid) {
      this.cargoConfigForm.markAllAsTouched();
      return;
    }

    const value = this.cargoConfigForm.getRawValue();
    const resuming = this.config() !== null;
    const minDestinations = this.currentIndex() + 1;

    if (resuming && value.totalDestinations! < minDestinations) {
      this.configError.set(
        `Há ${this.currentIndex()} entrega(s) já preenchida(s) e a atual em edição. O número de destinos deve ser no mínimo ${minDestinations}.`,
      );
      return;
    }

    this.configError.set(null);
    this.errorMessage.set(null);
    this.config.set({
      totalDestinations: value.totalDestinations!,
      loadOrder: value.loadOrder!,
      loadDate: value.loadDate!,
      issueDate: value.issueDate!,
      driverName: value.driverName || undefined,
      driverPhone: value.driverPhone || undefined,
      truck: value.truck || undefined,
      inspectionResponsible: value.inspectionResponsible || undefined,
      organizationResponsible: value.organizationResponsible || undefined,
      assistant1: value.assistant1 || undefined,
    });
    this.phase.set('wizard');

    if (resuming) return;

    this.drafts.set([]);
    this.cargo.set(null);
    this.currentIndex.set(0);
    this.resetDeliveryForm();
  }

  backToConfig(): void {
    this.errorMessage.set(null);
    this.configError.set(null);
    this.phase.set('config');
  }

  async confirmDelivery(): Promise<void> {
    if (this.deliveryForm.invalid) {
      this.deliveryForm.markAllAsTouched();
      return;
    }

    const config = this.config();
    if (!config) return;

    const delivery = this.buildDelivery();

    if (!this.isLastStep()) {
      this.drafts.update((list) => [...list, delivery]);
      this.currentIndex.update((i) => i + 1);
      this.resetDeliveryForm();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    try {
      const { totalDestinations: _total, ...header } = config;
      const cargo = await firstValueFrom(
        this.cargosService.create({ ...header, deliveries: [...this.drafts(), delivery] }),
      );
      this.cargo.set(cargo);
      this.phase.set('done');
    } catch (error) {
      this.errorMessage.set(this.extractErrorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  addItem(): void {
    this.deliveryForm.controls.items.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    if (this.deliveryForm.controls.items.length > 1) {
      this.deliveryForm.controls.items.removeAt(index);
    }
  }

  printDeliveryRomaneio(delivery: CargoDelivery): void {
    this.printingDelivery.set(delivery);
    setTimeout(() => window.print(), 0);
  }

  goToDetail(deliveryId: number): void {
    const cargoId = this.cargo()?.id;
    if (cargoId === undefined) return;
    this.router.navigate(['/cargas', cargoId, 'entregas', deliveryId]);
  }

  goToDashboard(): void {
    this.router.navigate(['/']);
  }

  startNewCargo(): void {
    this.config.set(null);
    this.drafts.set([]);
    this.cargo.set(null);
    this.errorMessage.set(null);
    this.configError.set(null);
    this.phase.set('config');
    this.currentIndex.set(0);
    this.printingDelivery.set(null);
    this.cargoConfigForm.reset({
      totalDestinations: 1,
      loadOrder: '',
      loadDate: '',
      issueDate: todayInSaoPaulo(),
      driverName: '',
      driverPhone: '',
      truck: '',
      inspectionResponsible: '',
      organizationResponsible: '',
      assistant1: '',
    });
  }

  private buildDelivery(): CargoDeliveryDto {
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

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message;
      if (Array.isArray(message)) return message.join(' · ');
      if (typeof message === 'string') return message;
    }
    return 'Não foi possível salvar a carga. Tente novamente.';
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
}
