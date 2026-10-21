import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../core/services/environment';
import { CargoSummary } from '../types/summary';

@Injectable({ providedIn: 'root' })
export class SummaryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  get(range: { from: string; to: string }): Observable<CargoSummary> {
    const params = new HttpParams().set('from', range.from).set('to', range.to);
    return this.http.get<CargoSummary>(`${this.apiUrl}/summary`, { params });
  }
}
