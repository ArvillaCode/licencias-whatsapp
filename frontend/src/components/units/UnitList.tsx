import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Unit } from '../../types/models';
import { useReorderUnits } from '../../hooks/useUnits';
import { useUnitEditor } from '../../hooks/useUnitEditor';

function UnitRow({ unit, onOpen }: { unit: Unit; onOpen: (unit: Unit) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: unit.id });
  const editor = useUnitEditor(unit);

  return (
    <tr
      ref={setNodeRef}
      onClick={() => !editor.isEditing && onOpen(unit)}
      style={{
        borderBottom: '1px solid var(--color-border)',
        cursor: editor.isEditing ? 'default' : 'pointer',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: isDragging ? 'relative' : undefined,
        zIndex: isDragging ? 10 : undefined,
        background: editor.isEditing ? 'var(--color-accent-glow)' : 'var(--color-bg-elevated)',
      }}
      onMouseEnter={(e) => {
        if (!editor.isEditing) e.currentTarget.style.background = 'var(--color-bg-hover)';
      }}
      onMouseLeave={(e) => {
        if (!editor.isEditing) e.currentTarget.style.background = 'var(--color-bg-elevated)';
      }}
    >
      <td style={{ padding: '0.6rem 0.4rem', width: 28 }}>
        {!editor.isEditing && (
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            title="Arrastrar para reordenar"
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'grab', touchAction: 'none', lineHeight: 1 }}
          >
            ⠿
          </button>
        )}
      </td>
      <td style={{ padding: '0.6rem 1rem', maxWidth: 0 }}>
        {editor.isEditing ? (
          <input
            className="input"
            value={editor.draft.address}
            onChange={(e) => editor.setField('address', e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Dirección"
            style={{ width: '100%' }}
          />
        ) : (
          <div title={unit.address} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {unit.address}
          </div>
        )}
      </td>
      <td style={{ padding: '0.6rem 1rem', fontWeight: 600 }}>
        {editor.isEditing ? (
          <input
            className="input"
            value={editor.draft.apartmentNo}
            onChange={(e) => editor.setField('apartmentNo', e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="# Apto"
            style={{ width: '100%' }}
          />
        ) : (
          unit.apartmentNo
        )}
      </td>
      <td style={{ padding: '0.6rem 1rem' }}>
        {editor.isEditing ? (
          <input
            className="input"
            value={editor.draft.tenantName}
            onChange={(e) => editor.setField('tenantName', e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Nombre del inquilino"
            style={{ width: '100%' }}
          />
        ) : (
          <span style={{ color: unit.tenantName ? 'inherit' : 'var(--color-text-muted)' }}>
            {unit.tenantName || 'Sin inquilino'}
          </span>
        )}
      </td>
      <td style={{ padding: '0.6rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {editor.isEditing ? (
          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
            <button
              className="btn"
              style={{ padding: '0.3rem 0.6rem' }}
              onClick={(e) => {
                e.stopPropagation();
                editor.cancelEdit();
              }}
            >
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              style={{ padding: '0.3rem 0.6rem' }}
              onClick={(e) => {
                e.stopPropagation();
                editor.save();
              }}
              disabled={editor.saving}
            >
              {editor.saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
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
        )}
      </td>
    </tr>
  );
}

export function UnitList({ units, onOpen }: { units: Unit[]; onOpen: (unit: Unit) => void }) {
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
    <div className="card-surface animate-fade-in-up" style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
        <colgroup>
          <col style={{ width: 28 }} />
          <col style={{ width: '40%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '22%' }} />
          <col style={{ width: '14%' }} />
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
                <UnitRow key={unit.id} unit={unit} onOpen={onOpen} />
              ))}
            </tbody>
          </SortableContext>
        </DndContext>
      </table>
    </div>
  );
}
