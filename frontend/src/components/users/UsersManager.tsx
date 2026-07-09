import { useState, type FormEvent } from 'react';
import {
  useUsers,
  useCreateUser,
  useUpdateUserPermissions,
  useResetUserPassword,
  useSetUserActive,
  useDeleteUser,
} from '../../hooks/useUsers';
import { PERMISSION_KEYS, PERMISSION_LABELS, type PermissionKey } from '../../lib/permissions';
import { ApiError } from '../../api/client';
import type { ManagedUser } from '../../api/users';

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado.';
}

export function UsersManager() {
  const { data: users, isLoading } = useUsers();
  const createUser = useCreateUser();
  const updatePermissions = useUpdateUserPermissions();
  const resetPassword = useResetUserPassword();
  const setActive = useSetUserActive();
  const deleteUser = useDeleteUser();

  const [email, setEmail] = useState('');
  const [newPerms, setNewPerms] = useState<PermissionKey[]>(['dashboard']);
  const [credential, setCredential] = useState<{ email: string; password: string; label: string } | null>(null);

  function toggleNewPerm(key: PermissionKey) {
    setNewPerms((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    const result = await createUser.mutateAsync({ email: email.trim(), permissions: newPerms });
    setCredential({ email: result.user.email, password: result.password, label: 'Usuario creado' });
    setEmail('');
    setNewPerms(['dashboard']);
  }

  async function handleReset(user: ManagedUser) {
    const result = await resetPassword.mutateAsync(user.id);
    setCredential({ email: user.email, password: result.password, label: 'Contraseña restablecida' });
  }

  function togglePerm(user: ManagedUser, key: PermissionKey) {
    const permissions = user.permissions.includes(key)
      ? user.permissions.filter((p) => p !== key)
      : [...user.permissions, key];
    updatePermissions.mutate({ id: user.id, permissions });
  }

  const createError = errorMessage(createUser.error);
  const actionError = errorMessage(updatePermissions.error || setActive.error || deleteUser.error || resetPassword.error);

  return (
    <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 900 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 'var(--font-size-2xl)' }}>Usuarios</h1>
        <p style={{ margin: '0.2rem 0 0', color: 'var(--color-text-secondary)' }}>
          Crea usuarios, comparte su contraseña y controla a qué secciones acceden.
        </p>
      </div>

      {credential && (
        <div
          className="card-surface"
          style={{
            padding: '1rem 1.1rem',
            borderColor: 'var(--color-accent)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--color-accent)' }}>{credential.label}</div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Comparte estos datos con la persona. La contraseña no se volverá a mostrar.
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Correo</div>
              <div style={{ fontWeight: 600 }}>{credential.email}</div>
            </div>
            <div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Contraseña</div>
              <code style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)', letterSpacing: '0.03em' }}>
                {credential.password}
              </code>
            </div>
            <button
              className="btn"
              onClick={() => navigator.clipboard?.writeText(`Correo: ${credential.email}\nContraseña: ${credential.password}`)}
            >
              Copiar
            </button>
            <button className="btn" onClick={() => setCredential(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleCreate} className="card-surface" style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        <div style={{ fontWeight: 600 }}>Crear nuevo usuario</div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: '1 1 240px' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Correo</span>
            <input
              className="input"
              type="email"
              placeholder="persona@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={createUser.isPending}>
            {createUser.isPending ? 'Creando…' : 'Crear usuario'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {PERMISSION_KEYS.map((key) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: 'var(--font-size-sm)' }}>
              <input type="checkbox" checked={newPerms.includes(key)} onChange={() => toggleNewPerm(key)} />
              {PERMISSION_LABELS[key]}
            </label>
          ))}
        </div>
        {createError && <div style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>{createError}</div>}
      </form>

      {actionError && <div style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>{actionError}</div>}
      {isLoading && <div style={{ color: 'var(--color-text-secondary)' }}>Cargando usuarios…</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {users?.map((user) => {
          const admin = user.role === 'ADMIN';
          return (
            <div
              key={user.id}
              className="card-surface"
              style={{ padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', opacity: user.active ? 1 : 0.55 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontWeight: 600 }}>{user.email}</span>
                  {admin && (
                    <span
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        background: 'var(--color-accent-glow)',
                        color: 'var(--color-accent)',
                        padding: '0.1rem 0.5rem',
                        borderRadius: 999,
                        fontWeight: 600,
                      }}
                    >
                      Administrador
                    </span>
                  )}
                  {!user.active && (
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Inactivo</span>
                  )}
                </div>
                {!admin && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="btn" onClick={() => handleReset(user)} disabled={resetPassword.isPending}>
                      Restablecer clave
                    </button>
                    <button className="btn" onClick={() => setActive.mutate({ id: user.id, active: !user.active })}>
                      {user.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => {
                        if (confirm(`¿Eliminar a ${user.email}?`)) deleteUser.mutate(user.id);
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {PERMISSION_KEYS.map((key) => (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: 'var(--font-size-sm)',
                      color: admin ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={admin ? true : user.permissions.includes(key)}
                      disabled={admin}
                      onChange={() => togglePerm(user, key)}
                    />
                    {PERMISSION_LABELS[key]}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
