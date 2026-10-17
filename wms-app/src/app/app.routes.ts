import { Routes } from '@angular/router';
import { CargoRegistration } from './features/cargo-registration/pages/cargo-registration';
import { LoadingDashboard } from './features/loading-dashboard/loading-dashboard';
import { DeliveryDetail } from './features/delivery-detail/delivery-detail';
import { ScanDelivery } from './features/scan-check/pages/scan-check';
import { CargoOverview } from './features/cargo-overview/cargo-overview';
import { Login } from './features/login/pages/login';

export const routes: Routes = [
  {
    path: '',
    component: Login,
  },
  {
    path: 'cargas',
    component: CargoOverview,
  },
  {
    path: 'cargas/novo',
    component: CargoRegistration,
  },
  {
    path: 'cargas/:cargoId',
    component: LoadingDashboard,
  },
  {
    path: 'cargas/:cargoId/entregas/:deliveryId',
    component: DeliveryDetail,
  },
  {
    path: 'conferencia/:cargoId/:deliveryId',
    component: ScanDelivery,
  },
];
