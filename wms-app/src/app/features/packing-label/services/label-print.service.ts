import {
  ApplicationRef,
  EnvironmentInjector,
  Injectable,
  createComponent,
  inject,
} from '@angular/core';
import { PackingLabel, ProductLabel } from '../pages/packing-label';

@Injectable({ providedIn: 'root' })
export class LabelPrintService {
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);

  print(labels: ProductLabel[]): void {
    const ref = createComponent(PackingLabel, { environmentInjector: this.injector });
    ref.setInput('labels', labels);
    this.appRef.attachView(ref.hostView);
    document.body.appendChild(ref.location.nativeElement);
    document.body.classList.add('printing-labels');
    this.appRef.tick();

    const cleanup = () => {
      window.removeEventListener('afterprint', cleanup);
      document.body.classList.remove('printing-labels');
      this.appRef.detachView(ref.hostView);
      ref.destroy();
    };
    window.addEventListener('afterprint', cleanup);

    setTimeout(() => window.print(), 0);
  }
}
