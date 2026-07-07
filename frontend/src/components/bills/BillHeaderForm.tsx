import type { Bill } from '../../types/models';
import { InlineEditable } from '../common/InlineEditable';
import { useUpdateBill } from '../../hooks/useBills';

export function BillHeaderForm({ bill, unitId }: { bill: Bill; unitId: number }) {
  const updateBill = useUpdateBill(unitId);

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
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
          # Recibo
        </div>
        <InlineEditable
          value={bill.billNumber ?? ''}
          placeholder="Configurar #"
          onSave={(v) => updateBill.mutate({ id: bill.id, input: { billNumber: v } })}
          fontWeight={600}
        />
      </div>
      <div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
          Fecha máxima de pago
        </div>
        <input
          type="date"
          className="input"
          value={bill.dueDate ? bill.dueDate.slice(0, 10) : ''}
          onChange={(e) => updateBill.mutate({ id: bill.id, input: { dueDate: e.target.value || null } })}
        />
      </div>
    </div>
  );
}
