import type { Bill } from '../../types/models';
import { InlineEditable } from '../common/InlineEditable';
import { useUpdateBill } from '../../hooks/useBills';
import { useAuth } from '../../contexts/AuthContext';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function BillHeaderForm({ bill, unitId }: { bill: Bill; unitId: number }) {
  const updateBill = useUpdateBill(unitId);
  const { isAdmin } = useAuth();

  const label = (text: string) => (
    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{text}</div>
  );

  return (
    <div
      style={{
        display: 'flex',
        gap: '2rem',
        flexWrap: 'wrap',
        padding: '0.9rem 1rem',
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
      }}
    >
      <div>
        {label('# Recibo')}
        {isAdmin ? (
          <InlineEditable
            value={bill.billNumber ?? ''}
            placeholder="Configurar #"
            onSave={(v) => updateBill.mutate({ id: bill.id, input: { billNumber: v } })}
            fontWeight={600}
          />
        ) : (
          <div style={{ fontWeight: 600 }}>{bill.billNumber || '—'}</div>
        )}
      </div>
      <div>
        {label('Vence cada mes')}
        {isAdmin ? (
          <select
            className="input"
            value={bill.dueDay ?? ''}
            onChange={(e) =>
              updateBill.mutate({ id: bill.id, input: { dueDay: e.target.value ? Number(e.target.value) : null } })
            }
          >
            <option value="">Sin definir</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                Día {d}
              </option>
            ))}
          </select>
        ) : (
          <div style={{ fontWeight: 600 }}>{bill.dueDay ? `Día ${bill.dueDay}` : '—'}</div>
        )}
      </div>
    </div>
  );
}
