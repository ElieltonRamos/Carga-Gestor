import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../core/services/environment';
import { Driver, DriverPayload, DriversPage } from '../types/driver';

@Injectable({ providedIn: 'root' })
export class DriversService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/drivers`;

  findAll(query: { page: number; limit: number; search?: string }): Observable<DriversPage> {
    let params = new HttpParams().set('page', query.page).set('limit', query.limit);
    if (query.search) params = params.set('search', query.search);
    return this.http.get<DriversPage>(this.apiUrl, { params });
  }

  create(payload: DriverPayload): Observable<Driver> {
    return this.http.post<Driver>(this.apiUrl, payload);
  }

  update(id: number, payload: DriverPayload): Observable<Driver> {
    return this.http.patch<Driver>(`${this.apiUrl}/${id}`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
