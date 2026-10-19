import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../core/services/environment';
import { PaginatedResponse } from '../../../core/types/paginated-response';
import {
  Cargo,
  CargoListItem,
  CreateCargoDto,
  DepartCargoDto,
  ListCargosQuery,
  ReopenCargoDto,
  UpdateCargoDto,
} from '../types/cargo';

@Injectable({ providedIn: 'root' })
export class CargosService {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);

  findAll(query: ListCargosQuery = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<PaginatedResponse<CargoListItem>>(`${this.apiUrl}/cargos`, { params });
  }

  findOne(id: number) {
    return this.http.get<Cargo>(`${this.apiUrl}/cargos/${id}`);
  }

  remove(id: number) {
    return this.http.delete<void>(`${this.apiUrl}/cargos/${id}`);
  }

  depart(id: number, dto: DepartCargoDto = {}) {
    return this.http.post<Cargo>(`${this.apiUrl}/cargos/${id}/depart`, dto);
  }

  reopen(id: number, dto: ReopenCargoDto) {
    return this.http.post<Cargo>(`${this.apiUrl}/cargos/${id}/reopen`, dto);
  }

  create(dto: CreateCargoDto) {
    return this.http.post<Cargo>(`${this.apiUrl}/cargos`, dto);
  }

  update(id: number, dto: UpdateCargoDto) {
    return this.http.patch<Cargo>(`${this.apiUrl}/cargos/${id}`, dto);
  }
}
