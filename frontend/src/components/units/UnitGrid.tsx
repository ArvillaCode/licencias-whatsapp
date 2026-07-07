import type { Unit } from '../../types/models';
import { UnitCard } from './UnitCard';

export function UnitGrid({ units, onOpen }: { units: Unit[]; onOpen: (unit: Unit) => void }) {
  return (
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
  );
}
