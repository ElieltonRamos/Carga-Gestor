import { Routes } from '@angular/router';
import { CargoRegistration } from './features/cargo-registration/pages/cargo-registration';
import { CargoDetail } from './features/cargo-detail/cargo-detail';
import { DeliveryDetail } from './features/delivery-detail/delivery-detail';
import { ScanDelivery } from './features/scan-check/pages/scan-check';
import { CargoOverview } from './features/cargo-overview/pages/cargo-overview';
import { Login } from './features/login/pages/login';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', component: Login },
  { path: 'cargas', component: CargoOverview, canActivate: [authGuard] },
  { path: 'cargas/novo', component: CargoRegistration, canActivate: [authGuard] },
  { path: 'cargas/:cargoId', component: CargoDetail, canActivate: [authGuard] },
  {
    path: 'cargas/:cargoId/entregas/:deliveryId',
    component: DeliveryDetail,
    canActivate: [authGuard],
  },
  { path: 'conferencia/:cargoId/:deliveryId', component: ScanDelivery, canActivate: [authGuard] },
];
