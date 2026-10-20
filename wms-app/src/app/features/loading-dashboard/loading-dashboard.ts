import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { computeVolumeProgress } from '../../shared/utils/volume-progress';
import { CargosService } from '../cargo-overview/services/cargos.service';
import { Cargo, CargoItem } from '../cargo-overview/types/cargo';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-loading-dashboard',
  imports: [DatePipe],
  templateUrl: './loading-dashboard.html',
})
export class LoadingDashboard {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cargosService = inject(CargosService);

  private readonly cargoId = Number(this.route.snapshot.paramMap.get('cargoId'));

  loading = signal(true);
  cargo = signal<Cargo | null>(null);
  expandedDeliveryId = signal<number | null>(null);

  notFound = computed(() => !this.loading() && this.cargo() === null);

  overall = computed(() => computeVolumeProgress(this.cargo() ?? {}));

  constructor() {
    this.cargosService.findOne(this.cargoId).subscribe({
      next: (cargo) => {
        this.cargo.set(cargo);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
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

  goToScan(deliveryId: number): void {
    this.router.navigate(['/conferencia', this.cargoId, deliveryId]);
  }

  goBack(): void {
    this.router.navigate(['/cargas']);
  }

  goToDetail(deliveryId: number): void {
    this.router.navigate(['/cargas', this.cargoId, 'entregas', deliveryId]);
  }

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
}
