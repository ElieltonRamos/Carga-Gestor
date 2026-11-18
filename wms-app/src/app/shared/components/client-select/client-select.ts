import { Component, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { ClientsService } from '../../../features/clients/services/clients.service';
import { Client } from '../../../features/clients/types/client';

// Termo que parece documento (com máscara) busca só pelos dígitos
const toSearch = (term: string): string => {
  const value = term.trim();
  return /^[\d.\-/\s]+$/.test(value) ? value.replace(/\D/g, '') : value;
};

@Component({
  selector: 'app-client-select',
  templateUrl: './client-select.html',
})
export class ClientSelect {
  private readonly clientsService = inject(ClientsService);
  private readonly search$ = new Subject<string>();

  readonly disabled = input(false);
  readonly placeholder = input('Buscar cliente cadastrado por nome ou CNPJ/CPF...');

  readonly clientSelected = output<Client>();

  protected readonly term = signal('');
  protected readonly options = signal<Client[]>([]);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  protected readonly open = signal(false);

  constructor() {
    this.search$
      .pipe(
        map(toSearch),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((search) => {
          if (!search) return of({ ok: true, items: [] as Client[] });
          this.loading.set(true);
          return this.clientsService.findAll({ page: 1, limit: 8, search }).pipe(
            map((page) => ({ ok: true, items: page.data })),
            catchError(() => of({ ok: false, items: [] as Client[] })),
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
    this.search$.next(value);
  }

  protected select(client: Client): void {
    this.term.set('');
    this.options.set([]);
    this.open.set(false);
    this.clientSelected.emit(client);
  }

  protected formatDocument(document: string | null): string {
    if (!document) return 'Sem documento';
    if (document.length === 11) {
      return document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (document.length === 14) {
      return document.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return document;
  }
}