import { useState, type FormEvent } from 'react';
import type { CatalogItem } from '../../types/models';
import { InlineEditable } from '../common/InlineEditable';

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado.';
}

interface CatalogManagerProps {
  title: string;
  items: CatalogItem[] | undefined;
  isLoading: boolean;
  onCreate: (name: string) => void;
  onToggleActive: (item: CatalogItem) => void;
  onRename: (item: CatalogItem, name: string) => void;
  createError?: unknown;
  updateError?: unknown;
}

export function CatalogManager({
  title,
  items,
  isLoading,
  onCreate,
  onToggleActive,
  onRename,
  createError,
  updateError,
}: CatalogManagerProps) {
  const [newName, setNewName] = useState('');

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName('');
  }

  const createErrorMessage = errorMessage(createError);
  const updateErrorMessage = errorMessage(updateError);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 520 }}>
      <h1 style={{ margin: 0, fontSize: 'var(--font-size-2xl)' }}>{title}</h1>

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.6rem' }}>
        <input
          className="input"
          placeholder="Nuevo…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary">
          + Agregar
        </button>
      </form>

      {(createErrorMessage || updateErrorMessage) && (
        <div style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>
          {createErrorMessage ?? updateErrorMessage}
        </div>
      )}


      {isLoading && <div style={{ color: 'var(--color-text-secondary)' }}>Cargando…</div>}

      <div className="card-surface" style={{ overflow: 'hidden' }}>
        {items?.map((item, i) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.7rem',
              padding: '0.7rem 1rem',
              borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
              opacity: item.active ? 1 : 0.5,
            }}
          >
            <div style={{ flex: 1 }}>
              <InlineEditable
                value={item.name}
                onSave={(v) => {
                  if (v) onRename(item, v);
                }}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              <input type="checkbox" checked={item.active} onChange={() => onToggleActive(item)} />
              Activo
            </label>
          </div>
        ))}
        {items?.length === 0 && (
          <div style={{ padding: '1rem', color: 'var(--color-text-secondary)' }}>Sin elementos todavía.</div>
        )}
      </div>
    </div>
  );
}
