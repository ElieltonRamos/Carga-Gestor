import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
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
  private readonly cargoService = inject(CargoService);
  private readonly router = inject(Router);

  dateFilter = signal<string>(this.todayIso());

  cargos = this.cargoService.cargos;

  filteredCargos = computed(() => {
    const filter = this.dateFilter();
    if (!filter) return this.cargos();
    return this.cargos().filter((c) => c.loadDate === filter);
  });

  overall = computed(() =>
    computeCargoProgress(this.filteredCargos().flatMap((c) => c.deliveries)),
  );

  deliveryRows = computed(() =>
    this.filteredCargos().flatMap((cargo) =>
      cargo.deliveries.map((delivery) => ({
        cargoId: cargo.id,
        loadOrder: cargo.loadOrder,
        progress: computeDeliveryProgress(delivery),
      })),
    ),
  );

  onDateChange(value: string): void {
    this.dateFilter.set(value);
  }

  clearFilter(): void {
    this.dateFilter.set('');
  }

  goToNewCargo(): void {
    this.router.navigate(['/cargas/novo']);
  }

  goToScan(cargoId: string, deliveryId: string): void {
    this.router.navigate(['/conferencia', cargoId, deliveryId]);
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
