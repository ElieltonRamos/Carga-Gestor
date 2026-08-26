import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CargoService } from '../cargo-registration/services/cargo-registration.service';
import {
  computeCargoProgress,
  computeDeliveryProgress,
} from '../../shared/utils/delivery-progress';

@Component({
  selector: 'app-loading-dashboard',
  imports: [],
  templateUrl: './loading-dashboard.html',
})
export class LoadingDashboard {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cargoService = inject(CargoService);

  private cargoId = this.route.snapshot.paramMap.get('cargoId')!;

  expandedDeliveryId = signal<string | null>(null);

  cargo = this.cargoService.getCargoSignal(this.cargoId);

  notFound = computed(() => this.cargo() === null);

  overall = computed(() => computeCargoProgress(this.cargo()?.deliveries ?? []));

  deliveryRows = computed(() =>
    (this.cargo()?.deliveries ?? []).map((delivery) => ({
      delivery,
      progress: computeDeliveryProgress(delivery),
    })),
  );

  toggleExpand(deliveryId: string): void {
    this.expandedDeliveryId.set(this.expandedDeliveryId() === deliveryId ? null : deliveryId);
  }

  isExpanded(deliveryId: string): boolean {
    return this.expandedDeliveryId() === deliveryId;
  }

  itemStatus(
    loadedQuantity: number | undefined,
    volumeCount: number | undefined,
  ): 'loaded' | 'pending' {
    const total = volumeCount ?? 1;
    const loaded = loadedQuantity ?? 0;
    return loaded >= total ? 'loaded' : 'pending';
  }

  goToScan(deliveryId: string): void {
    this.router.navigate(['/conferencia', this.cargoId, deliveryId]);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  goToDetail(deliveryId: string): void {
    this.router.navigate(['/cargas', this.cargoId, 'entregas', deliveryId]);
  }
}
