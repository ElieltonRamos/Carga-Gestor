import { Routes } from '@angular/router';
import { CargoRegistration } from './features/cargo-registration/pages/cargo-registration';
import { DeliveryDetail } from './features/delivery-detail/delivery-detail';
import { LoadingDashboard } from './features/loading-dashboard/loading-dashboard';

export const routes: Routes = [
  {
    path: '',
    component: CargoRegistration,
  },
  {
    path: 'cargas/:cargoId/entregas/:deliveryId',
    component: DeliveryDetail,
  },
  {
    path: 'carregamento',
    component: LoadingDashboard,
  },
];
