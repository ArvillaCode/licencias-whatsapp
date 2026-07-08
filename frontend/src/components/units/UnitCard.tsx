import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Unit } from '../../types/models';
import { InlineEditable } from '../common/InlineEditable';
import { useUpdateUnit, useDeleteUnit } from '../../hooks/useUnits';

export function UnitCard({ unit, onOpen }: { unit: Unit; onOpen: (unit: Unit) => void }) {
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: unit.id });

  return (
    <div
      ref={setNodeRef}
      className="card-surface"
      onClick={() => onOpen(unit)}
      style={{
        padding: '1.1rem 1.2rem',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        transform: CSS.Transform.toString(transform),
        transition: [transition, 'border-color 0.15s ease', 'box-shadow 0.15s ease'].filter(Boolean).join(', '),
        ...(isDragging ? { opacity: 0.5, zIndex: 10 } : {}),
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
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
          <div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              <InlineEditable
                value={unit.address}
                onSave={(v) => updateUnit.mutate({ id: unit.id, input: { address: v } })}
                fontSize="var(--font-size-sm)"
              />
            </div>
            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginTop: 2 }}>
              Apto{' '}
              <InlineEditable
                value={unit.apartmentNo}
                onSave={(v) => updateUnit.mutate({ id: unit.id, input: { apartmentNo: v } })}
                fontWeight={700}
                fontSize="var(--font-size-lg)"
              />
            </div>
          </div>
        </div>
        <button
          className="btn btn-danger"
          style={{ padding: '0.3rem 0.5rem' }}
          title="Eliminar unidad"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`¿Eliminar la unidad ${unit.address} #${unit.apartmentNo}?`)) {
              deleteUnit.mutate(unit.id);
            }
          }}
        >
          🗑
        </button>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.6rem' }}>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
          Inquilino
        </div>
        <InlineEditable
          value={unit.tenantName ?? ''}
          placeholder="Agregar inquilino"
          onSave={(v) => updateUnit.mutate({ id: unit.id, input: { tenantName: v } })}
        />
      </div>
    </div>
  );
}
