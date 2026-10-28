import { Component, input } from '@angular/core';
import { Barcode } from '../components/barcode';

export interface ProductLabel {
  destino?: string;
  product: string;
  volumeIndex: number;
  volumeTotal: number;
  weight?: number;
  deliverySequence: number;
  code?: string;
}

@Component({
  selector: 'app-packing-label',
  imports: [Barcode],
  templateUrl: './packing-label.html',
  host: { class: 'block' },
})
export class PackingLabel {
  labels = input<ProductLabel[]>([]);
}
