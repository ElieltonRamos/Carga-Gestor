import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../services/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const isApi = req.url.startsWith(environment.apiUrl);
  const token = localStorage.getItem('token');

  if (isApi && token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      const isLogin = req.url.endsWith('/users/login');
      if (isApi && !isLogin && error instanceof HttpErrorResponse && error.status === 401) {
        localStorage.removeItem('token');
        router.navigate(['/']);
      }
      return throwError(() => error);
    }),
  );
};
