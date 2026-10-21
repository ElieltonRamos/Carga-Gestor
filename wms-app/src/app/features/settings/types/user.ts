export type UserRole = 'ADMIN' | 'OPERATOR' | 'CHECKER';

export interface User {
  id: number;
  name: string;
  username: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  name: string;
  username: string;
  password: string;
  role: UserRole;
}

export type UpdateUserPayload = Partial<CreateUserPayload>;
