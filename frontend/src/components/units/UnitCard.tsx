import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Unit } from '../../types/models';
import { useUnitEditor } from '../../hooks/useUnitEditor';

export function UnitCard({ unit, onOpen }: { unit: Unit; onOpen: (unit: Unit) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: unit.id });
  const editor = useUnitEditor(unit);

  return (
    <div
      ref={setNodeRef}
      className="card-surface"
      onClick={() => !editor.isEditing && onOpen(unit)}
      style={{
        padding: '1.1rem 1.2rem',
        cursor: editor.isEditing ? 'default' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        transform: CSS.Transform.toString(transform),
        transition: [transition, 'border-color 0.15s ease', 'box-shadow 0.15s ease'].filter(Boolean).join(', '),
        ...(isDragging ? { opacity: 0.5, zIndex: 10 } : {}),
        ...(editor.isEditing ? { borderColor: 'var(--color-accent)' } : {}),
      }}
      onMouseEnter={(e) => {
        if (!editor.isEditing) e.currentTarget.style.borderColor = 'var(--color-accent)';
      }}
      onMouseLeave={(e) => {
        if (!editor.isEditing) e.currentTarget.style.borderColor = 'var(--color-border)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
          {!editor.isEditing && (
            <button
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              title="Arrastrar para reordenar"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'grab',
                padding: '0.1rem 0.2rem',
                touchAction: 'none',
                lineHeight: 1,
              }}
            >
              ⠿
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {editor.isEditing ? (
              <input
                className="input"
                value={editor.draft.address}
                onChange={(e) => editor.setField('address', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Dirección"
                style={{ fontSize: 'var(--font-size-sm)', width: '100%', marginBottom: '0.35rem' }}
              />
            ) : (
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{unit.address}</div>
            )}

            {editor.isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontWeight: 700 }}>Apto</span>
                <input
                  className="input"
                  value={editor.draft.apartmentNo}
                  onChange={(e) => editor.setField('apartmentNo', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="# Apto"
                  style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)', width: 90 }}
                />
              </div>
            ) : (
              <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginTop: 2 }}>Apto {unit.apartmentNo}</div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
          {!editor.isEditing && (
            <button
              className="btn"
              style={{ padding: '0.3rem 0.5rem' }}
              title="Editar unidad"
              onClick={(e) => {
                e.stopPropagation();
                editor.startEdit();
              }}
            >
              ✏️
            </button>
          )}
          <button
            className="btn btn-danger"
            style={{ padding: '0.3rem 0.5rem' }}
            title="Eliminar unidad"
            onClick={(e) => {
              e.stopPropagation();
              editor.remove();
            }}
            disabled={editor.deleting}
          >
            🗑
          </button>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.6rem' }}>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
          Inquilino
        </div>
        {editor.isEditing ? (
          <input
            className="input"
            value={editor.draft.tenantName}
            onChange={(e) => editor.setField('tenantName', e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Nombre del inquilino"
            style={{ width: '100%', marginTop: '0.3rem' }}
          />
        ) : (
          <div style={{ color: unit.tenantName ? 'inherit' : 'var(--color-text-muted)' }}>
            {unit.tenantName || 'Sin inquilino'}
          </div>
        )}
      </div>

      {editor.isEditing && (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            className="btn"
            onClick={(e) => {
              e.stopPropagation();
              editor.cancelEdit();
            }}
          >
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={(e) => {
              e.stopPropagation();
              editor.save();
            }}
            disabled={editor.saving}
          >
            {editor.saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      )}
    </div>
  );
}
