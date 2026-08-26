import { Component, input } from '@angular/core';

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
  imports: [],
  templateUrl: './packing-label.html',
})
export class PackingLabel {
  labels = input<ProductLabel[]>([]);
}
