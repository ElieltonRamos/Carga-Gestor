import { Component, ElementRef, effect, input, viewChild } from '@angular/core';
import JsBarcode from 'jsbarcode';

@Component({
  selector: 'app-barcode',
  template: `<svg #svg class="block w-full h-full"></svg>`,
  host: { class: 'block' },
})
export class Barcode {
  value = input.required<string>();
  private svg = viewChild.required<ElementRef<SVGSVGElement>>('svg');

  constructor() {
    effect(() => {
      const el = this.svg().nativeElement;
      JsBarcode(el, this.value().toUpperCase(), {
        format: 'CODE39',
        displayValue: false,
        margin: 0,
        width: 2,
        height: 60,
        lineColor: '#000',
        background: 'transparent',
      });
      const w = parseFloat(el.getAttribute('width') ?? '0');
      const h = parseFloat(el.getAttribute('height') ?? '0');
      el.setAttribute('viewBox', `0 0 ${w} ${h}`);
      el.setAttribute('preserveAspectRatio', 'none');
      el.removeAttribute('width');
      el.removeAttribute('height');
    });
  }
}
