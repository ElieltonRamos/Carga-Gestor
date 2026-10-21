import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const digitsLength =
  (lengths: number[]): ValidatorFn =>
  (control: AbstractControl): ValidationErrors | null => {
    const digits = String(control.value ?? '').replace(/\D/g, '');
    if (!digits) return null;
    return lengths.includes(digits.length) ? null : { digits: true };
  };

export const onlyDigits = (value: string): string => value.replace(/\D/g, '');

export const orNull = (value: string): string | null => value.trim() || null;

export const httpErrorMessage = (err: HttpErrorResponse, fallback: string): string => {
  if (err.status === 0 || err.status === 500) return 'Servidor indisponível';
  const msg = err.error?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg || fallback;
};
