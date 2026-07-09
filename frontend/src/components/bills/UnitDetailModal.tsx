import { useEffect, useState } from 'react';
import type { Unit } from '../../types/models';
import { useBillsForUnit } from '../../hooks/useBills';
import { BillTab } from './BillTab';

export function UnitDetailModal({ unit, onClose }: { unit: Unit; onClose: () => void }) {
  const { data: bills, isLoading } = useBillsForUnit(unit.id);
  const [activeBillId, setActiveBillId] = useState<number | null>(null);

  useEffect(() => {
    if (bills && bills.length > 0 && activeBillId === null) {
      setActiveBillId(bills[0].id);
    }
  }, [bills, activeBillId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const activeBill = bills?.find((b) => b.id === activeBillId) ?? null;

  return (
    <div
      onClick={onClose}
      className="animate-backdrop-in"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        padding: '1.5rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card-surface animate-scale-in"
        style={{
          width: 'min(880px, 100%)',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.1rem',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{unit.address}</div>
            <h2 style={{ margin: '0.1rem 0 0', fontSize: 'var(--font-size-xl)' }}>
              Apto {unit.apartmentNo} {unit.tenantName ? `— ${unit.tenantName}` : ''}
            </h2>
          </div>
          <button className="btn" onClick={onClose} title="Cerrar">
            ✕
          </button>
        </div>

        {isLoading && <div style={{ color: 'var(--color-text-secondary)' }}>Cargando recibos…</div>}

        {bills && (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.6rem' }}>
            {bills.map((bill) => (
              <button
                key={bill.id}
                onClick={() => setActiveBillId(bill.id)}
                className="btn"
                style={{
                  border: 'none',
                  background: activeBillId === bill.id ? 'var(--color-accent-glow)' : 'transparent',
                  color: activeBillId === bill.id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  fontWeight: activeBillId === bill.id ? 600 : 500,
                }}
              >
                {bill.billType.name}
              </button>
            ))}
          </div>
        )}

        {activeBill && <BillTab bill={activeBill} unit={unit} />}
      </div>
    </div>
  );
}
