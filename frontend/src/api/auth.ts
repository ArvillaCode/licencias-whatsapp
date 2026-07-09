import { api } from './client';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
}

export const authApi = {
  login: (email: string, password: string) => api.post<AuthUser>('/auth/login', { email, password }),
  logout: () => api.post<void>('/auth/logout'),
  me: () => api.get<AuthUser>('/auth/me'),
};
