import {
  ApplicationRef,
  EnvironmentInjector,
  Injectable,
  Type,
  createComponent,
  inject,
} from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PrintService {
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);

  print<T>(component: Type<T>, inputs: Record<string, unknown>): void {
    const ref = createComponent(component, { environmentInjector: this.injector });
    for (const [key, value] of Object.entries(inputs)) ref.setInput(key, value);
    this.appRef.attachView(ref.hostView);
    document.body.appendChild(ref.location.nativeElement);
    document.body.classList.add('printing-isolated');
    this.appRef.tick();

    const cleanup = () => {
      window.removeEventListener('afterprint', cleanup);
      document.body.classList.remove('printing-isolated');
      this.appRef.detachView(ref.hostView);
      ref.destroy();
    };
    window.addEventListener('afterprint', cleanup);

    setTimeout(() => window.print(), 0);
  }
}
