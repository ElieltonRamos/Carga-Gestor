import { Component, input } from '@angular/core';
import { CargoDelivery } from '../../cargo-overview/types/cargo';

@Component({
  selector: 'app-romaneio-print',
  templateUrl: './romaneio-print.html',
  host: { class: 'block' },
})
export class RomaneioPrint {
  delivery = input.required<CargoDelivery>();
}
