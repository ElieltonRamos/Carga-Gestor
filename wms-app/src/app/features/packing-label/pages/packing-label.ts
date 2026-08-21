import { Component, computed, input } from '@angular/core';
import { Romaneio } from '../types/packing-label';

@Component({
  selector: 'app-packing-label',
  imports: [],
  templateUrl: './packing-label.html',
})
export class PackingLabel {
  romaneio = input.required<Romaneio>();

  totalVolumes = computed(() => this.romaneio().itens.length);

  pesoTotal = computed(() =>
    this.romaneio().itens.reduce((soma, item) => soma + (item.peso ?? 0), 0),
  );

  imprimir(): void {
    window.print();
  }
}
