import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../core/services/environment';
import { Client, ClientPayload, ClientsPage } from '../types/client';

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/clients`;

  findAll(query: { page: number; limit: number; search?: string }): Observable<ClientsPage> {
    let params = new HttpParams().set('page', query.page).set('limit', query.limit);
    if (query.search) params = params.set('search', query.search);
    return this.http.get<ClientsPage>(this.apiUrl, { params });
  }

  create(payload: ClientPayload): Observable<Client> {
    return this.http.post<Client>(this.apiUrl, payload);
  }

  update(id: number, payload: ClientPayload): Observable<Client> {
    return this.http.patch<Client>(`${this.apiUrl}/${id}`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
