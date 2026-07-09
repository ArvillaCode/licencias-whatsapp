import { api } from './client';
import type { PermissionKey } from '../lib/permissions';

export interface ManagedUser {
  id: number;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  permissions: PermissionKey[];
  active: boolean;
  createdAt: string;
}

export interface CreatedUser {
  user: ManagedUser;
  password: string;
}

export const usersApi = {
  list: () => api.get<ManagedUser[]>('/users'),
  create: (email: string, permissions: PermissionKey[]) =>
    api.post<CreatedUser>('/users', { email, permissions }),
  updatePermissions: (id: number, permissions: PermissionKey[]) =>
    api.put<ManagedUser>(`/users/${id}/permissions`, { permissions }),
  resetPassword: (id: number) => api.post<{ password: string }>(`/users/${id}/reset-password`),
  setActive: (id: number, active: boolean) => api.put<ManagedUser>(`/users/${id}/active`, { active }),
  remove: (id: number) => api.delete<void>(`/users/${id}`),
};
