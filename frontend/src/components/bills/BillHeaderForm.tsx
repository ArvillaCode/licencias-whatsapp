import type { Bill } from '../../types/models';
import { InlineEditable } from '../common/InlineEditable';
import { useUpdateBill } from '../../hooks/useBills';
import { useAuth } from '../../contexts/AuthContext';

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
        {label('Fecha máxima de pago')}
        {isAdmin ? (
          <input
            type="date"
            className="input"
            value={bill.dueDate ? bill.dueDate.slice(0, 10) : ''}
            onChange={(e) => updateBill.mutate({ id: bill.id, input: { dueDate: e.target.value || null } })}
          />
        ) : (
          <div style={{ fontWeight: 600 }}>{bill.dueDate ? bill.dueDate.slice(0, 10) : '—'}</div>
        )}
      </div>
    </div>
  );
}
