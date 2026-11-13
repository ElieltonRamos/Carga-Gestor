import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../core/services/environment';
import { CargoSummary } from '../types/summary';
import { Reports } from '../types/reports';

@Injectable({ providedIn: 'root' })
export class SummaryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  get(range: { from: string; to: string }): Observable<CargoSummary> {
    return this.http.get<CargoSummary>(`${this.apiUrl}/summary`, {
      params: this.toParams(range),
    });
  }

  reports(range: { from: string; to: string }): Observable<Reports> {
    return this.http.get<Reports>(`${this.apiUrl}/summary/reports`, {
      params: this.toParams(range),
    });
  }

  private toParams(range: { from: string; to: string }): HttpParams {
    return new HttpParams().set('from', range.from).set('to', range.to);
  }
}
