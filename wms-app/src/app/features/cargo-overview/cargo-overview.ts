import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CargoService } from '../cargo-registration/services/cargo-registration.service';
import { computeCargoProgress, ProgressStatus } from '../../shared/utils/delivery-progress';

const STATUS_ORDER: Record<ProgressStatus, number> = {
  partial: 0,
  pending: 1,
  complete: 2,
};

@Component({
  selector: 'app-cargo-overview',
  imports: [],
  templateUrl: './cargo-overview.html',
})
export class CargoOverview {
  private readonly cargoService = inject(CargoService);
  private readonly router = inject(Router);

  dateFilter = signal<string>(this.todayIso());

  cargos = this.cargoService.cargos;

  filteredCargos = computed(() => {
    const filter = this.dateFilter();
    const list = filter ? this.cargos().filter((c) => c.loadDate === filter) : this.cargos();

    return list
      .map((cargo) => ({
        cargo,
        progress: computeCargoProgress(cargo.deliveries),
      }))
      .sort((a, b) => STATUS_ORDER[a.progress.status] - STATUS_ORDER[b.progress.status]);
  });

  onDateChange(value: string): void {
    this.dateFilter.set(value);
  }

  clearFilter(): void {
    this.dateFilter.set('');
  }

  goToNewCargo(): void {
    this.router.navigate(['/cargas/novo']);
  }

  goToCargo(cargoId: string): void {
    this.router.navigate(['/cargas', cargoId]);
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  resetAll(): void {
    this.cargoService.resetAll();
  }

  resetToMock(): void {
    this.cargoService.resetToMock();
  }
}
