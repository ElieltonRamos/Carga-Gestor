import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, filter, of, switchMap } from 'rxjs';
import { SummaryService } from '../services/summary.service';
import { ScanReason } from '../types/summary';
import { RouterLink } from '@angular/router';

const todayInSaoPaulo = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

const REASON_LABELS: Record<ScanReason, string> = {
  NOT_FOUND: 'Volume não encontrado',
  ALREADY_LOADED: 'Já carregado',
  WRONG_CARGO: 'Carga errada',
  CARGO_DEPARTED: 'Carga já expedida',
};

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly summaryService = inject(SummaryService);

  private readonly today = todayInSaoPaulo();

  from = signal(`${this.today.slice(0, 8)}01`);
  to = signal(this.today);

  invalidRange = computed(() => !this.from() || !this.to() || this.from() > this.to());

  private readonly state = toSignal(
    toObservable(computed(() => ({ from: this.from(), to: this.to() }))).pipe(
      filter(({ from, to }) => !!from && !!to && from <= to),
      switchMap((range) => this.summaryService.get(range).pipe(catchError(() => of(null)))),
    ),
    { initialValue: undefined },
  );

  summary = computed(() => this.state() ?? null);
  loading = computed(() => this.state() === undefined);
  failed = computed(() => this.state() === null);

  loadedPercentage = computed(() => {
    const v = this.summary()?.volumes;
    return v && v.total > 0 ? Math.round((v.loaded / v.total) * 100) : 0;
  });

  reasons = computed(() =>
    Object.entries(this.summary()?.scans.byReason ?? {}).map(([reason, count]) => ({
      label: REASON_LABELS[reason as ScanReason],
      count,
    })),
  );

  setFrom(value: string): void {
    this.from.set(value);
  }

  setTo(value: string): void {
    this.to.set(value);
  }

  resetToMonth(): void {
    this.from.set(`${this.today.slice(0, 8)}01`);
    this.to.set(this.today);
  }
}
