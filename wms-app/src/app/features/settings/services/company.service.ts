import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../core/services/environment';
import { Company, CompanyPayload } from '../types/company';

export interface CompanyLogo {
  logo: string | null;
}

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

  getLogo(): Observable<CompanyLogo> {
    return this.http.get<CompanyLogo>(`${this.apiUrl}/logo`);
  }

  setLogo(logo: string): Observable<CompanyLogo> {
    return this.http.put<CompanyLogo>(`${this.apiUrl}/logo`, { logo });
  }

  removeLogo(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/logo`);
  }
}
