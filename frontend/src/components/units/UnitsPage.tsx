import { useState } from 'react';
import { useUnits } from '../../hooks/useUnits';
import { useUIState } from '../../contexts/UIStateContext';
import { useAuth } from '../../contexts/AuthContext';
import { UnitGrid } from './UnitGrid';
import { UnitList } from './UnitList';
import { ViewToggle } from './ViewToggle';
import { UnitFormModal } from './UnitFormModal';
import type { Unit } from '../../types/models';
import { UnitDetailModal } from '../bills/UnitDetailModal';

export function UnitsPage() {
  const { data: units, isLoading, isError } = useUnits();
  const { viewMode } = useUIState();
  const { isAdmin } = useAuth();
  const canEditUnits = isAdmin;
  const canOpen = true;
  const [showCreate, setShowCreate] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  return (
    <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'var(--font-size-2xl)' }}>Unidades</h1>
          <p style={{ margin: '0.2rem 0 0', color: 'var(--color-text-secondary)' }}>
            {units?.length ?? 0} unidades registradas
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <ViewToggle />
          {canEditUnits && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + Nueva unidad
            </button>
          )}
        </div>
      </div>

      {isLoading && <div style={{ color: 'var(--color-text-secondary)' }}>Cargando unidades…</div>}
      {isError && <div style={{ color: 'var(--color-danger)' }}>No se pudieron cargar las unidades.</div>}

      {units &&
        (viewMode === 'cards' ? (
          <UnitGrid units={units} onOpen={setSelectedUnit} canEditUnits={canEditUnits} canOpen={canOpen} />
        ) : (
          <UnitList units={units} onOpen={setSelectedUnit} canEditUnits={canEditUnits} canOpen={canOpen} />
        ))}

      {showCreate && <UnitFormModal onClose={() => setShowCreate(false)} />}
      {selectedUnit && <UnitDetailModal unit={selectedUnit} onClose={() => setSelectedUnit(null)} />}
    </div>
  );
}
