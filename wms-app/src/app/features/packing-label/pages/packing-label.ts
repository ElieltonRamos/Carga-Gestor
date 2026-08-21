import { Component, computed, input } from '@angular/core';
import { PackingList } from '../types/packing-label';

@Component({
  selector: 'app-packing-label',
  imports: [],
  templateUrl: './packing-label.html',
})
export class PackingLabel {
  packingLists = input.required<PackingList[]>();

  totalVolumes(list: PackingList): number {
    return list.items.length;
  }

  totalWeight(list: PackingList): number {
    return list.items.reduce((sum, item) => sum + (item.weight ?? 0), 0);
  }

  print(): void {
    window.print();
  }
}
