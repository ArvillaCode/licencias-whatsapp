import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi, type AuthUser } from '../api/auth';
import { ApiError } from '../api/client';
import type { PermissionKey } from '../lib/permissions';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  can: (permission: PermissionKey) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const loggedUser = await authApi.login(email, password);
    setUser(loggedUser);
  }

  async function logout() {
    await authApi.logout().catch(() => undefined);
    setUser(null);
  }

  const isAdmin = user?.role === 'ADMIN';
  const can = (permission: PermissionKey) => isAdmin || !!user?.permissions?.includes(permission);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, can, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

export { ApiError };
