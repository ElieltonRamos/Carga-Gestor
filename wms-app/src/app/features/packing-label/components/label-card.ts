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
      class="w-[100mm] h-[49.5mm] overflow-hidden border border-print-ink bg-print-bg text-print-ink flex flex-col px-[2mm] pb-[2mm] pt-[1mm]"
    >
      <div
        class="shrink-0 flex justify-between items-center gap-[2mm] border-b border-print-ink pb-[0.8mm]"
      >
        <div class="flex items-center gap-[1.5mm] min-w-0">
          @if (logo()) {
            <img
              [src]="logo()"
              alt=""
              class="h-[9mm] w-auto max-w-[40mm] object-contain shrink-0"
            />
          }
          <div class="text-[13px] font-black leading-[1.1] line-clamp-1">
            {{ companyName() || 'WMS' }}
          </div>
        </div>
        <div class="text-right leading-none shrink-0">
          <div class="text-[8px] font-bold uppercase tracking-wide">Destino</div>
          <div class="text-lg font-bold">{{ l.destino || '—' }}</div>
        </div>
      </div>

      <div
        class="grow min-h-0 overflow-hidden grid grid-cols-[3fr_2fr] gap-[1.5mm] py-[0.8mm] leading-[1.1]"
      >
        <div class="min-w-0 flex flex-col gap-[0.3mm]">
          <div class="text-[13px] font-bold line-clamp-1">{{ l.clientName }}</div>
          <div class="text-[10.5px] line-clamp-2">
            {{ l.clientAddress }}
            @if (l.clientNeighborhood) {
              - {{ l.clientNeighborhood }}
            }
          </div>
          <div class="text-[10.5px] truncate">
            @if (l.clientZipCode) {
              CEP {{ l.clientZipCode }} ·
            }
            {{ l.clientCity }}
            @if (l.clientState) {
              /{{ l.clientState }}
            }
          </div>
          @if (l.clientPhone) {
            <div class="text-[10.5px] truncate">Tel: {{ l.clientPhone }}</div>
          }
        </div>

        <div class="min-w-0 border-l border-print-ink pl-[1.5mm] flex flex-col gap-[0.5mm]">
          <div class="line-clamp-2">
            <span class="text-[8px] font-bold uppercase tracking-wide mr-[1mm]">Produto:</span>
            <span class="text-[13px] font-bold">{{ l.product }}</span>
          </div>
          @if (l.notes) {
            <div class="line-clamp-2">
              <span class="text-[8px] font-bold uppercase tracking-wide mr-[1mm]">Obs:</span>
              <span class="text-[10.5px]">{{ l.notes }}</span>
            </div>
          }
        </div>
      </div>

      <div class="shrink-0 flex justify-between border-t border-print-ink pt-[0.8mm] leading-none">
        <div>
          <div class="text-[8px] font-bold uppercase tracking-wide">Volume</div>
          <div class="text-[15px] font-bold">{{ l.volumeIndex }}/{{ l.volumeTotal }}</div>
        </div>
        <div class="text-center">
          <div class="text-[8px] font-bold uppercase tracking-wide">Entrega</div>
          <div class="text-[15px] font-bold">
            Nº {{ l.deliverySequence.toString().padStart(3, '0') }}
          </div>
        </div>
        <div class="text-right">
          <div class="text-[8px] font-bold uppercase tracking-wide">Peso</div>
          <div class="text-[15px] font-bold">{{ l.weight ?? '—' }}kg</div>
        </div>
      </div>

      <div
        class="shrink-0 border-t border-print-ink pt-[0.8mm] mt-[0.8mm] flex flex-col items-center"
      >
        <app-barcode class="w-full h-[7mm]" [value]="l.code || 'SEM-CODIGO'" />
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
