import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { ProductsService } from '../../../features/products/services/products.service';
import { Product } from '../../../features/products/types/product';

@Component({
  selector: 'app-product-select',
  templateUrl: './product-select.html',
})
export class ProductSelect {
  private readonly productsService = inject(ProductsService);
  private readonly search$ = new Subject<string>();

  readonly text = input('');
  readonly productId = input<number | null>(null);
  readonly disabled = input(false);
  readonly placeholder = input('Buscar produto ou digitar nome novo...');

  readonly productSelected = output<Product>();
  readonly nameChanged = output<string>();

  protected readonly term = signal('');
  protected readonly options = signal<Product[]>([]);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  protected readonly open = signal(false);

  constructor() {
    // Mantém o campo igual ao valor do form (patchValue, reset, abrir edição)
    effect(() => {
      const text = this.text();
      untracked(() => {
        if (text !== this.term()) this.term.set(text);
      });
    });

    this.search$
      .pipe(
        map((term) => term.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          if (!term) return of({ ok: true, items: [] as Product[] });
          this.loading.set(true);
          return this.productsService.findAll({ page: 1, limit: 8, search: term }).pipe(
            map((page) => ({ ok: true, items: page.data })),
            catchError(() => of({ ok: false, items: [] as Product[] })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ ok, items }) => {
        this.options.set(items);
        this.failed.set(!ok);
        this.loading.set(false);
      });
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.term.set(value);
    this.open.set(true);
    this.nameChanged.emit(value);
    this.search$.next(value);
  }

  protected select(product: Product): void {
    this.term.set(product.name);
    this.options.set([]);
    this.open.set(false);
    this.productSelected.emit(product);
  }
}