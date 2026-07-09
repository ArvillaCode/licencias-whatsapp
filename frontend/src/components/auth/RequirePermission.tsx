import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { PermissionKey } from '../../lib/permissions';

/** Renderiza el contenido solo si el usuario tiene el permiso (o cualquiera de varios). */
export function RequirePermission({
  permission,
  anyOf,
  adminOnly,
  children,
}: {
  permission?: PermissionKey;
  anyOf?: PermissionKey[];
  adminOnly?: boolean;
  children: ReactNode;
}) {
  const { can, isAdmin } = useAuth();

  let allowed = false;
  if (adminOnly) allowed = isAdmin;
  else if (anyOf) allowed = anyOf.some((p) => can(p));
  else if (permission) allowed = can(permission);

  if (!allowed) return <Navigate to="/" replace />;
  return <>{children}</>;
}
