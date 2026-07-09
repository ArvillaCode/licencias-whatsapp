import { api } from './client';
import type { PermissionKey } from '../lib/permissions';

export interface AuthUser {
  id: number;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  permissions: PermissionKey[];
}

export const authApi = {
  login: (email: string, password: string) => api.post<AuthUser>('/auth/login', { email, password }),
  logout: () => api.post<void>('/auth/logout'),
  me: () => api.get<AuthUser>('/auth/me'),
};
