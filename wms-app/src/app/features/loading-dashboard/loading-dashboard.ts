import { Component, computed, inject } from '@angular/core';
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

  cargo = this.cargoService.cargo;

  overall = computed(() => computeCargoProgress(this.cargo()));

  deliveries = computed(() =>
    (this.cargo()?.deliveries ?? []).map((delivery) => computeDeliveryProgress(delivery)),
  );

  goToScan(deliveryId: string): void {
    const cargoId = this.cargo()?.id;
    if (!cargoId) return;
    this.router.navigate(['/conferencia', cargoId, deliveryId]);
  }
}
