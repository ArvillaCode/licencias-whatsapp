import { useEffect, useState } from 'react';
import type { Unit } from '../types/models';
import { useDeleteUnit, useUpdateUnit } from './useUnits';

interface UnitDraft {
  address: string;
  apartmentNo: string;
  tenantName: string;
}

function draftFromUnit(unit: Unit): UnitDraft {
  return { address: unit.address, apartmentNo: unit.apartmentNo, tenantName: unit.tenantName ?? '' };
}

export function useUnitEditor(unit: Unit) {
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<UnitDraft>(() => draftFromUnit(unit));

  useEffect(() => {
    if (!isEditing) setDraft(draftFromUnit(unit));
  }, [unit.address, unit.apartmentNo, unit.tenantName, isEditing]);

  function startEdit() {
    setDraft(draftFromUnit(unit));
    setIsEditing(true);
  }

  function cancelEdit() {
    setDraft(draftFromUnit(unit));
    setIsEditing(false);
  }

  function setField<K extends keyof UnitDraft>(field: K, value: UnitDraft[K]) {
    setDraft((d) => ({ ...d, [field]: value }));
  }

  function save() {
    if (!draft.address.trim() || !draft.apartmentNo.trim()) {
      alert('La dirección y el # de apto no pueden quedar vacíos.');
      return;
    }
    if (!confirm('¿Guardar los cambios de esta unidad?')) return;
    updateUnit.mutate(
      {
        id: unit.id,
        input: {
          address: draft.address.trim(),
          apartmentNo: draft.apartmentNo.trim(),
          tenantName: draft.tenantName.trim() || null,
        },
      },
      { onSuccess: () => setIsEditing(false) }
    );
  }

  function remove() {
    if (!confirm(`¿Eliminar la unidad ${unit.address} #${unit.apartmentNo}? Esta acción no se puede deshacer.`)) return;
    deleteUnit.mutate(unit.id);
  }

  return {
    isEditing,
    draft,
    setField,
    startEdit,
    cancelEdit,
    save,
    remove,
    saving: updateUnit.isPending,
    deleting: deleteUnit.isPending,
  };
}
