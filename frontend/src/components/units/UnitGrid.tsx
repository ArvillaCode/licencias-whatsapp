import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import type { Unit } from '../../types/models';
import { UnitCard } from './UnitCard';
import { useReorderUnits } from '../../hooks/useUnits';

export function UnitGrid({ units, onOpen }: { units: Unit[]; onOpen: (unit: Unit) => void }) {
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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={units.map((u) => u.id)} strategy={rectSortingStrategy}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '1rem',
          }}
        >
          {units.map((unit) => (
            <UnitCard key={unit.id} unit={unit} onOpen={onOpen} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
