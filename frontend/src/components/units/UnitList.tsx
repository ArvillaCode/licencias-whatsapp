import type { Unit } from '../../types/models';
import { InlineEditable } from '../common/InlineEditable';
import { useUpdateUnit, useDeleteUnit } from '../../hooks/useUnits';

export function UnitList({ units, onOpen }: { units: Unit[]; onOpen: (unit: Unit) => void }) {
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();

  return (
    <div className="card-surface" style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
        <colgroup>
          <col style={{ width: '46%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '26%' }} />
          <col style={{ width: '12%' }} />
        </colgroup>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
            {['Dirección', '# Apto', 'Inquilino', ''].map((h) => (
              <th
                key={h}
                style={{
                  padding: '0.7rem 1rem',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => (
            <tr
              key={unit.id}
              onClick={() => onOpen(unit)}
              style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <td
                title={unit.address}
                style={{
                  padding: '0.6rem 1rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 0,
                }}
              >
                {unit.address}
              </td>
              <td style={{ padding: '0.6rem 1rem', fontWeight: 600 }}>
                <InlineEditable
                  value={unit.apartmentNo}
                  onSave={(v) => updateUnit.mutate({ id: unit.id, input: { apartmentNo: v } })}
                />
              </td>
              <td style={{ padding: '0.6rem 1rem' }}>
                <InlineEditable
                  value={unit.tenantName ?? ''}
                  placeholder="Agregar inquilino"
                  onSave={(v) => updateUnit.mutate({ id: unit.id, input: { tenantName: v } })}
                />
              </td>
              <td style={{ padding: '0.6rem 1rem', textAlign: 'right' }}>
                <button
                  className="btn btn-danger"
                  style={{ padding: '0.3rem 0.5rem' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`¿Eliminar la unidad ${unit.address} #${unit.apartmentNo}?`)) {
                      deleteUnit.mutate(unit.id);
                    }
                  }}
                >
                  🗑
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
