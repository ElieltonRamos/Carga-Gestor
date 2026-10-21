import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../core/services/environment';
import { CreateUserPayload, UpdateUserPayload, User, UserRole } from '../types/user';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/users`;

  findAll(filters: { username?: string; role?: UserRole }): Observable<User[]> {
    let params = new HttpParams();
    if (filters.username) params = params.set('username', filters.username);
    if (filters.role) params = params.set('role', filters.role);
    return this.http.get<User[]>(this.apiUrl, { params });
  }

  create(payload: CreateUserPayload): Observable<User> {
    return this.http.post<User>(this.apiUrl, payload);
  }

  update(id: number, payload: UpdateUserPayload): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${id}`, payload);
  }

  remove(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
