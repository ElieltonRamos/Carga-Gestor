import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CargoService } from '../../cargo-registration/services/cargo-registration.service';
import { ScanService } from '../services/scan.service';
import { computeDeliveryProgress } from '../../../shared/utils/delivery-progress';

type Feedback = { type: 'ok' | 'error' | 'warning'; message: string } | null;

@Component({
  selector: 'app-scan-delivery',
  imports: [FormsModule],
  templateUrl: './scan-check.html',
})
export class ScanDelivery {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cargoService = inject(CargoService);
  private readonly scanService = inject(ScanService);

  private cargoId = this.route.snapshot.paramMap.get('cargoId')!;
  private deliveryId = this.route.snapshot.paramMap.get('deliveryId')!;

  scanInput = viewChild<ElementRef<HTMLInputElement>>('scanInput');

  code = signal('');
  feedback = signal<Feedback>(null);
  isScanning = signal(false);

  cargo = this.cargoService.getCargoSignal(this.cargoId);

  delivery = computed(() => this.cargo()?.deliveries.find((d) => d.id === this.deliveryId) ?? null);

  notFound = computed(() => this.cargo() === null || !this.delivery());

  progress = computed(() => {
    const delivery = this.delivery();
    return delivery ? computeDeliveryProgress(delivery) : null;
  });

  async onScan(): Promise<void> {
    const delivery = this.delivery();
    const codeValue = this.code().trim();

    if (!delivery || !codeValue) return;

    this.isScanning.set(true);
    const result = await this.scanService.scan(this.cargoId, delivery, codeValue);
    this.isScanning.set(false);

    this.code.set('');
    this.focusInput();

    if (result.status === 'not_found') {
      this.feedback.set({
        type: 'error',
        message: `Código "${codeValue}" não pertence a este romaneio.`,
      });
      return;
    }

    if (result.status === 'already_complete') {
      this.feedback.set({ type: 'warning', message: 'Item já completo. Verifique o produto.' });
      return;
    }

    const item = delivery.items[result.itemIndex];
    this.feedback.set({
      type: 'ok',
      message: `${item.product}: ${result.loadedQuantity}/${result.volumeCount} volumes bipados.`,
    });
  }

  focusInput(): void {
    this.scanInput()?.nativeElement.focus();
  }

  goBack(): void {
    this.router.navigate(['/cargas']);
  }
}
