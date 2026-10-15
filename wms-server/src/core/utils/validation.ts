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
