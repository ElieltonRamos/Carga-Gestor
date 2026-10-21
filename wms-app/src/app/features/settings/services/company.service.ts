import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../core/services/environment';
import { Company, CompanyPayload } from '../types/company';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/company`;

  get(): Observable<Company> {
    return this.http.get<Company>(this.apiUrl);
  }

  update(payload: Partial<CompanyPayload>): Observable<Company> {
    return this.http.patch<Company>(this.apiUrl, payload);
  }
}
