import { useState, type FormEvent } from 'react';
import {
  useUsers,
  useCreateUser,
  useUpdateUserName,
  useResetUserPassword,
  useSetUserActive,
  useDeleteUser,
} from '../../hooks/useUsers';
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
  const updateName = useUpdateUserName();
  const resetPassword = useResetUserPassword();
  const setActive = useSetUserActive();
  const deleteUser = useDeleteUser();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [credential, setCredential] = useState<{ email: string; password: string; label: string } | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;
    const result = await createUser.mutateAsync({ email: email.trim(), name: name.trim() });
    setCredential({ email: result.user.email, password: result.password, label: 'Usuario creado' });
    setEmail('');
    setName('');
  }

  async function handleReset(user: ManagedUser) {
    const result = await resetPassword.mutateAsync(user.id);
    setCredential({ email: user.email, password: result.password, label: 'Contraseña restablecida' });
  }

  const createError = errorMessage(createUser.error);
  const actionError = errorMessage(updateName.error || setActive.error || deleteUser.error || resetPassword.error);

  return (
    <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 820 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 'var(--font-size-2xl)' }}>Usuarios</h1>
        <p style={{ margin: '0.2rem 0 0', color: 'var(--color-text-secondary)' }}>
          Crea usuarios y comparte su contraseña. El nombre queda como responsable de los pagos que registren.
        </p>
      </div>

      {credential && (
        <div
          className="card-surface"
          style={{ padding: '1rem 1.1rem', borderColor: 'var(--color-accent)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
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
              <code style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)', letterSpacing: '0.03em' }}>{credential.password}</code>
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
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: '1 1 200px' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Nombre</span>
            <input className="input" placeholder="Nombre y apellido" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: '1 1 220px' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>Correo</span>
            <input className="input" type="email" placeholder="persona@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <button type="submit" className="btn btn-primary" disabled={createUser.isPending}>
            {createUser.isPending ? 'Creando…' : 'Crear usuario'}
          </button>
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
              style={{ padding: '1rem 1.1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', opacity: user.active ? 1 : 0.55 }}
            >
              <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    className="input"
                    defaultValue={user.name}
                    style={{ fontWeight: 600, flex: 1 }}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== user.name) updateName.mutate({ id: user.id, name: v });
                    }}
                  />
                  {admin && (
                    <span
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        background: 'var(--color-accent-glow)',
                        color: 'var(--color-accent)',
                        padding: '0.1rem 0.5rem',
                        borderRadius: 999,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Administrador
                    </span>
                  )}
                  {!user.active && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Inactivo</span>}
                </div>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{user.email}</div>
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
                      if (confirm(`¿Eliminar a ${user.name || user.email}?`)) deleteUser.mutate(user.id);
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
