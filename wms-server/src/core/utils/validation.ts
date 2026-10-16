import { registerDecorator } from 'class-validator';

// src/core/utils/validation.ts
export const ValidationMessages = {
  IS_NOT_EMPTY: (field: string) => `${field} é obrigatório`,
  IS_NOT_BLANK: (field: string) => `${field} não pode ser vazio`,
  IS_STRING: (field: string) => `${field} deve ser um texto`,
  IS_EMAIL: (field = 'Email') => `${field} deve ser válido`,
  IS_NUMBER: (field: string) => `${field} deve ser um número`,
  IS_INT: (field: string) => `${field} deve ser um número inteiro`,
  MIN: (field: string, min: number) => `${field} deve ser no mínimo ${min}`,
  MAX: (field: string, max: number) => `${field} deve ser no máximo ${max}`,
  MIN_LENGTH: (field: string, min: number) =>
    `${field} deve ter no mínimo ${min} caracteres`,
  MAX_LENGTH: (field: string, max: number) =>
    `${field} deve ter no máximo ${max} caracteres`,
  IS_ENUM: (field: string) => `${field} inválido`,
  IS_BOOLEAN: (field: string) => `${field} deve ser verdadeiro ou falso`,
  EXACT_DIGITS: (field: string, digits: number) =>
    `${field} deve ter ${digits} dígitos`,
  DATE_ONLY: (field: string) => `${field} deve estar no formato AAAA-MM-DD`,
  IS_ARRAY: (field: string) => `${field} deve ser uma lista`,
  ARRAY_NOT_EMPTY: (field: string) => `${field} deve ter ao menos um item`,
  IS_DECIMAL: (field: string, places: number) =>
    `${field} deve ser um número com até ${places} casas decimais`,
};

export const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// String vazia vira null, para limpar um campo opcional
export const trimOrNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

export const digitsOrNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const onlyDigits = value.replace(/\D/g, '');
  return onlyDigits === '' ? null : onlyDigits;
};

export const upperOrNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const upper = value.trim().toUpperCase();
  return upper === '' ? null : upper;
};

export const digits = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/\D/g, '') : value;

export function IsDateOnly(field: string) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isDateOnly',
      target: object.constructor,
      propertyName,
      options: { message: ValidationMessages.DATE_ONLY(field) },
      validator: {
        validate: (value: unknown) => {
          if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return false;
          }
          const date = new Date(`${value}T00:00:00.000Z`);
          return (
            !Number.isNaN(date.getTime()) &&
            date.toISOString().startsWith(value)
          );
        },
      },
    });
}
