import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { CargoListItem } from '../types/cargo';
import { CargosService } from '../services/cargos.service';

type ProgressStatus = 'pending' | 'partial' | 'complete';

const todayInSaoPaulo = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

const computeProgress = (cargo: CargoListItem) => {
  const { totalVolumes, loadedVolumes } = cargo;
  const status: ProgressStatus =
    totalVolumes > 0 && loadedVolumes === totalVolumes
      ? 'complete'
      : loadedVolumes > 0
        ? 'partial'
        : 'pending';
  const percentage = totalVolumes > 0 ? Math.round((loadedVolumes / totalVolumes) * 100) : 0;
  return { status, percentage };
};

@Component({
  selector: 'app-cargo-overview',
  imports: [DatePipe],
  templateUrl: './cargo-overview.html',
})
export class CargoOverview {
  private readonly cargosService = inject(CargosService);
  private readonly router = inject(Router);

  private readonly today = todayInSaoPaulo();
  readonly limit = 10;

  dateFilter = signal<string>(this.today);
  page = signal(1);

  isToday = computed(() => this.dateFilter() === this.today);

  private readonly query = computed(() => {
    const date = this.dateFilter();
    return {
      page: this.page(),
      limit: this.limit,
      createdFrom: date || undefined,
      createdTo: date || undefined,
    };
  });

  private readonly response = toSignal(
    toObservable(this.query).pipe(
      switchMap((query) => this.cargosService.findAll(query).pipe(catchError(() => of(null)))),
    ),
    { initialValue: null },
  );

  entries = computed(() =>
    (this.response()?.data ?? []).map((cargo) => ({ cargo, progress: computeProgress(cargo) })),
  );

  totalPages = computed(() => this.response()?.totalPages ?? 0);

  onDateChange(value: string): void {
    this.dateFilter.set(value);
    this.page.set(1);
  }

  resetToToday(): void {
    this.onDateChange(this.today);
  }

  prevPage(): void {
    this.page.update((p) => Math.max(1, p - 1));
  }

  nextPage(): void {
    this.page.update((p) => Math.min(this.totalPages(), p + 1));
  }

  goToNewCargo(): void {
    this.router.navigate(['/cargas/novo']);
  }

  goToCargo(cargoId: number): void {
    this.router.navigate(['/cargas', cargoId]);
  }
}
