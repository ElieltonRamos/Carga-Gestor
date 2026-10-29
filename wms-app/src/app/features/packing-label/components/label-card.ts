import { Component, input } from '@angular/core';
import { Barcode } from './barcode';

export interface ProductLabel {
  destino?: string;
  product: string;
  notes?: string;
  volumeIndex: number;
  volumeTotal: number;
  weight?: number;
  deliverySequence: number;
  code?: string;
  clientName?: string;
  clientAddress?: string;
  clientNeighborhood?: string;
  clientCity?: string;
  clientState?: string;
  clientZipCode?: string;
  clientPhone?: string;
}

@Component({
  selector: 'app-label-card',
  imports: [Barcode],
  template: `
    @let l = label();
    <div
      class="w-[100mm] h-[50mm] overflow-hidden border border-print-ink bg-print-bg text-print-ink flex flex-col p-[2mm]"
    >
      <div class="flex justify-between items-center gap-[2mm] border-b border-print-ink pb-[1mm]">
        <div class="flex items-center gap-[1.5mm] min-w-0">
          @if (logo()) {
            <img
              [src]="logo()"
              alt=""
              class="h-[7mm] w-auto max-w-[22mm] object-contain shrink-0"
            />
          }
          <div class="text-[10px] font-black leading-tight line-clamp-2">
            {{ companyName() || 'WMS' }}
          </div>
        </div>
        <div class="text-right leading-none shrink-0">
          <div class="text-[7px] font-bold uppercase tracking-wide">Destino</div>
          <div class="text-sm font-bold">{{ l.destino || '—' }}</div>
        </div>
      </div>

      <div class="mt-[0.5mm] border-b border-print-ink pb-[0.5mm] leading-tight min-h-0">
        <div class="text-[10px] font-bold truncate">{{ l.clientName }}</div>
        <div class="text-[8px] truncate">
          {{ l.clientAddress }}
          @if (l.clientNeighborhood) {
            - {{ l.clientNeighborhood }}
          }
        </div>
        <div class="text-[8px] truncate">
          @if (l.clientZipCode) {
            CEP {{ l.clientZipCode }} ·
          }
          {{ l.clientCity }}
          @if (l.clientState) {
            /{{ l.clientState }}
          }
          @if (l.clientPhone) {
            · {{ l.clientPhone }}
          }
        </div>
      </div>

      <div class="mt-[0.5mm] leading-tight">
        <span class="text-[7px] font-bold uppercase tracking-wide">Produto:</span>
        <span class="text-[10px] font-bold line-clamp-1">{{ l.product }}</span>
      </div>

      @if (l.notes) {
        <div class="leading-tight text-[8px] truncate">
          <span class="font-bold uppercase tracking-wide">Obs:</span> {{ l.notes }}
        </div>
      }

      <div
        class="flex justify-between mt-[0.5mm] border-t border-print-ink pt-[0.5mm] leading-none"
      >
        <div>
          <div class="text-[7px] font-bold uppercase tracking-wide">Volume</div>
          <div class="text-xs font-bold">{{ l.volumeIndex }}/{{ l.volumeTotal }}</div>
        </div>
        <div class="text-center">
          <div class="text-[7px] font-bold uppercase tracking-wide">Entrega</div>
          <div class="text-xs font-bold">
            Nº {{ l.deliverySequence.toString().padStart(3, '0') }}
          </div>
        </div>
        <div class="text-right">
          <div class="text-[7px] font-bold uppercase tracking-wide">Peso</div>
          <div class="text-xs font-bold">{{ l.weight ?? '—' }}kg</div>
        </div>
      </div>

      <div class="mt-auto border-t border-print-ink pt-[0.5mm] flex flex-col items-center">
        <app-barcode class="w-full h-[8mm]" [value]="l.code || 'SEM-CODIGO'" />
        <div class="tracking-widest text-[8px] font-bold leading-none mt-[0.5mm]">
          {{ l.code || 'SEM-CODIGO' }}
        </div>
      </div>
    </div>
  `,
  host: { class: 'block' },
})
export class LabelCard {
  label = input.required<ProductLabel>();
  companyName = input<string>('');
  logo = input<string | null>(null);
}
