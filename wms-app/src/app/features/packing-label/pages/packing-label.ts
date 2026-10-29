import { Component, input } from '@angular/core';
import { LabelCard, ProductLabel } from '../components/label-card';

export type { ProductLabel };

@Component({
  selector: 'app-packing-label',
  imports: [LabelCard],
  templateUrl: './packing-label.html',
  host: { class: 'block' },
})
export class PackingLabel {
  labels = input<ProductLabel[]>([]);
  companyName = input<string>('');
  logo = input<string | null>(null);
}
