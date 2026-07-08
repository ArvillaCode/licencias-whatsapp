import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Unit } from '../../types/models';
import { InlineEditable } from '../common/InlineEditable';
import { useUpdateUnit, useDeleteUnit, useReorderUnits } from '../../hooks/useUnits';

function UnitRow({
  unit,
  onOpen,
  onUpdate,
  onDelete,
}: {
  unit: Unit;
  onOpen: (unit: Unit) => void;
  onUpdate: (id: number, input: { address?: string; apartmentNo?: string; tenantName?: string }) => void;
  onDelete: (unit: Unit) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: unit.id });

  return (
    <tr
      ref={setNodeRef}
      onClick={() => onOpen(unit)}
      style={{
        borderBottom: '1px solid var(--color-border)',
        cursor: 'pointer',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: isDragging ? 'relative' : undefined,
        zIndex: isDragging ? 10 : undefined,
        background: 'var(--color-bg-elevated)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-bg-elevated)')}
    >
      <td style={{ padding: '0.6rem 0.4rem', width: 28 }}>
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          title="Arrastrar para reordenar"
          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'grab', touchAction: 'none', lineHeight: 1 }}
        >
          ⠿
        </button>
      </td>
      <td style={{ padding: '0.6rem 1rem', maxWidth: 0 }}>
        <InlineEditable
          value={unit.address}
          title={unit.address}
          displayStyle={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          onSave={(v) => onUpdate(unit.id, { address: v })}
        />
      </td>
      <td style={{ padding: '0.6rem 1rem', fontWeight: 600 }}>
        <InlineEditable value={unit.apartmentNo} onSave={(v) => onUpdate(unit.id, { apartmentNo: v })} />
      </td>
      <td style={{ padding: '0.6rem 1rem' }}>
        <InlineEditable
          value={unit.tenantName ?? ''}
          placeholder="Agregar inquilino"
          onSave={(v) => onUpdate(unit.id, { tenantName: v })}
        />
      </td>
      <td style={{ padding: '0.6rem 1rem', textAlign: 'right' }}>
        <button
          className="btn btn-danger"
          style={{ padding: '0.3rem 0.5rem' }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(unit);
          }}
        >
          🗑
        </button>
      </td>
    </tr>
  );
}

export function UnitList({ units, onOpen }: { units: Unit[]; onOpen: (unit: Unit) => void }) {
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();
  const reorderUnits = useReorderUnits();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = units.findIndex((u) => u.id === active.id);
    const newIndex = units.findIndex((u) => u.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    reorderUnits.mutate(arrayMove(units, oldIndex, newIndex));
  }

  return (
    <div className="card-surface" style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
        <colgroup>
          <col style={{ width: 28 }} />
          <col style={{ width: '44%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '24%' }} />
          <col style={{ width: '12%' }} />
        </colgroup>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
            {['', 'Dirección', '# Apto', 'Inquilino', ''].map((h, i) => (
              <th
                key={i}
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={units.map((u) => u.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {units.map((unit) => (
                <UnitRow
                  key={unit.id}
                  unit={unit}
                  onOpen={onOpen}
                  onUpdate={(id, input) => updateUnit.mutate({ id, input })}
                  onDelete={(u) => {
                    if (confirm(`¿Eliminar la unidad ${u.address} #${u.apartmentNo}?`)) {
                      deleteUnit.mutate(u.id);
                    }
                  }}
                />
              ))}
            </tbody>
          </SortableContext>
        </DndContext>
      </table>
    </div>
  );
}
