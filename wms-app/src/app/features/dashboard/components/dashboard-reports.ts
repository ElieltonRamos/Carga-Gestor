import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { SummaryService } from '../services/summary.service';

@Component({
  selector: 'app-dashboard-reports',
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './dashboard-reports.html',
})
export class DashboardReports {
  private readonly summaryService = inject(SummaryService);

  readonly from = input.required<string>();
  readonly to = input.required<string>();

  private readonly state = toSignal(
    toObservable(computed(() => ({ from: this.from(), to: this.to() }))).pipe(
      switchMap((range) => this.summaryService.reports(range).pipe(catchError(() => of(null)))),
    ),
    { initialValue: undefined },
  );

  reports = computed(() => this.state() ?? null);
  failed = computed(() => this.state() === null);

  dayMax = computed(() => Math.max(0, ...(this.reports()?.scansByDay.map((d) => d.total) ?? [])));
  hourMax = computed(() => Math.max(0, ...(this.reports()?.scansByHour.map((h) => h.total) ?? [])));

  pct(value: number, max: number): number {
    return max > 0 ? Math.round((value / max) * 100) : 0;
  }

  dayLabel(day: string): string {
    const [, month, date] = day.split('-');
    return `${date}/${month}`;
  }

  duration(seconds: number | null): string {
    if (seconds === null) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}min`;
    if (m > 0) return `${m}min`;
    return `${seconds}s`;
  }
}
