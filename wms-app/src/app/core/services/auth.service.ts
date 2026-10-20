import { Injectable } from '@angular/core';

export type UserRole = 'ADMIN' | 'OPERATOR' | 'CHECKER';

export default interface User {
  id: number;
  name: string;
  username: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface Token {
  token: string;
  licenseWarning?: string;
}

export interface TokenPayload {
  userId: number;
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private decode(token: string): TokenPayload | null {
    try {
      const part = token.split('.')[1];
      if (!part) return null;
      const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return null;
    }
  }

  isValidToken(token: string): boolean {
    const payload = this.decode(token);
    return (
      !!payload &&
      typeof payload.exp === 'number' &&
      payload.exp > Math.floor(Date.now() / 1000) + 60
    );
  }

  hasRole(token: string, role: UserRole): boolean {
    return this.decode(token)?.role === role;
  }

  isAuthenticated(): boolean {
    return this.isValidToken(localStorage.getItem('token') ?? '');
  }

  getTokenPayload(token?: string): TokenPayload | null {
    return this.decode(token ?? localStorage.getItem('token') ?? '');
  }
}
