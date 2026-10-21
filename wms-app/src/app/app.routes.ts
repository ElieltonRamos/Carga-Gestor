import { Routes } from '@angular/router';
import { Login } from './features/login/pages/login';
import { CargoOverview } from './features/cargo-overview/pages/cargo-overview';
import { CargoRegistration } from './features/cargo-registration/pages/cargo-registration';
import { CargoDetail } from './features/cargo-detail/cargo-detail';
import { DeliveryDetail } from './features/delivery-detail/delivery-detail';
import { ScanDelivery } from './features/scan-check/pages/scan-check';
import { authGuard } from './core/guards/auth.guard';
import { AppLayout } from './shared/app-layout/app-layout';
import { Dashboard } from './features/dashboard/pages/dashboard';
import { Clients } from './features/clients/pages/clients';
import { Settings } from './features/settings/pages/settings';

export const routes: Routes = [
  { path: '', component: Login },
  {
    path: '',
    component: AppLayout,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'cargas', component: CargoOverview },
      { path: 'cargas/novo', component: CargoRegistration },
      { path: 'cargas/:cargoId', component: CargoDetail },
      { path: 'cargas/:cargoId/entregas/:deliveryId', component: DeliveryDetail },
      { path: 'conferencia/:cargoId/:deliveryId', component: ScanDelivery },
      { path: 'clientes', component: Clients },
      { path: 'configuracoes', component: Settings },
    ],
  },
];
