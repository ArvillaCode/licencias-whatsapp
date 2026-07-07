import { api } from './client';

export interface AuthUser {
  id: number;
  username: string;
}

export const authApi = {
  login: (username: string, password: string) => api.post<AuthUser>('/auth/login', { username, password }),
  logout: () => api.post<void>('/auth/logout'),
  me: () => api.get<AuthUser>('/auth/me'),
};
