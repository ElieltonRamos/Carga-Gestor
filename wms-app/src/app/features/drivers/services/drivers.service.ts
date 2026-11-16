import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../core/services/environment';
import { Driver, DriverPayload, DriversPage } from '../types/driver';
import { DriverReview } from '../types/driver-review';
import { PaginatedResponse } from '../../../core/types/paginated-response';

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

  findReviews(
    driverId: number,
    query: { page: number; limit: number; cargoId?: number },
  ): Observable<PaginatedResponse<DriverReview>> {
    let params = new HttpParams().set('page', query.page).set('limit', query.limit);
    if (query.cargoId) params = params.set('cargoId', query.cargoId);
    return this.http.get<PaginatedResponse<DriverReview>>(`${this.apiUrl}/${driverId}/reviews`, { params });
  }

  createReview(
    driverId: number,
    payload: { rating: number; cargoId?: number; comment?: string | null },
  ): Observable<DriverReview> {
    return this.http.post<DriverReview>(`${this.apiUrl}/${driverId}/reviews`, payload);
  }
}
