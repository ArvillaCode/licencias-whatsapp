import { api } from './client';

export interface ManagedUser {
  id: number;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  active: boolean;
  createdAt: string;
}

export interface CreatedUser {
  user: ManagedUser;
  password: string;
}

export const usersApi = {
  list: () => api.get<ManagedUser[]>('/users'),
  create: (email: string, name: string) => api.post<CreatedUser>('/users', { email, name }),
  updateName: (id: number, name: string) => api.put<ManagedUser>(`/users/${id}`, { name }),
  resetPassword: (id: number) => api.post<{ password: string }>(`/users/${id}/reset-password`),
  setActive: (id: number, active: boolean) => api.put<ManagedUser>(`/users/${id}/active`, { active }),
  remove: (id: number) => api.delete<void>(`/users/${id}`),
};
