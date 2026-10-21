import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, filter, of, switchMap } from 'rxjs';
import { CargoListItem } from '../types/cargo';
import { CargosService } from '../services/cargos.service';

type ProgressStatus = 'pending' | 'partial' | 'complete';
type Preset = 'week' | 'month';

const WEEK_START = 1; // 0 = domingo, 1 = segunda

const todayInSaoPaulo = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

const startOfMonth = (ymd: string) => `${ymd.slice(0, 8)}01`;

const startOfWeek = (ymd: string) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  const diff = (d.getUTCDay() - WEEK_START + 7) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
};

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
  private readonly monthStart = startOfMonth(this.today);
  private readonly weekStart = startOfWeek(this.today);

  readonly limit = 10;

  from = signal(this.monthStart);
  to = signal(this.today);
  page = signal(1);

  invalidRange = computed(() => !this.from() || !this.to() || this.from() > this.to());

  activePreset = computed<Preset | null>(() => {
    if (this.to() !== this.today) return null;
    if (this.from() === this.monthStart) return 'month';
    if (this.from() === this.weekStart) return 'week';
    return null;
  });

  private readonly query = computed(() => ({
    page: this.page(),
    limit: this.limit,
    createdFrom: this.from(),
    createdTo: this.to(),
  }));

  private readonly response = toSignal(
    toObservable(this.query).pipe(
      filter((q) => !!q.createdFrom && !!q.createdTo && q.createdFrom <= q.createdTo),
      switchMap((query) => this.cargosService.findAll(query).pipe(catchError(() => of(null)))),
    ),
    { initialValue: null },
  );

  entries = computed(() =>
    this.invalidRange()
      ? []
      : (this.response()?.data ?? []).map((cargo) => ({ cargo, progress: computeProgress(cargo) })),
  );

  totalPages = computed(() => (this.invalidRange() ? 0 : (this.response()?.totalPages ?? 0)));

  setFrom(value: string): void {
    this.from.set(value);
    this.page.set(1);
  }

  setTo(value: string): void {
    this.to.set(value);
    this.page.set(1);
  }

  setWeek(): void {
    this.from.set(this.weekStart);
    this.to.set(this.today);
    this.page.set(1);
  }

  setMonth(): void {
    this.from.set(this.monthStart);
    this.to.set(this.today);
    this.page.set(1);
  }

  presetClass(preset: Preset): string {
    const base = 'h-10 px-3 rounded-input border text-sm transition-colors';
    return this.activePreset() === preset
      ? `${base} border-btn-primary-bg bg-btn-primary-bg text-text-inverse`
      : `${base} border-btn-secondary-border bg-btn-secondary-bg text-btn-secondary-text hover:bg-btn-secondary-hover`;
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
