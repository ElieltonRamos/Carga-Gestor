import { Routes } from '@angular/router';
import { Login } from './features/login/pages/login';
import { PackingLabel } from './features/packing-label/pages/packing-label';
import { CargoRegistration } from './features/cargo-registration/pages/cargo-registration';

export const routes: Routes = [
  // {
  //   path: '',
  //   component: Login,
  // },
  // {
  //   path: 'romaneios',
  //   component: PackingLabel,
  // },
  {
    path: '',
    component: CargoRegistration,
  },
];
