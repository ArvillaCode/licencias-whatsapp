import type { MonthlyRecord } from '../../types/models';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function MonthCard({
  record,
  selected,
  onClick,
}: {
  record: MonthlyRecord;
  selected: boolean;
  onClick: () => void;
}) {
  const hasEvidence = record.evidences.length > 0;
  const hasPayment = record.amountPaid != null;
  const status: 'done' | 'partial' | 'empty' = hasEvidence && hasPayment ? 'done' : hasEvidence || hasPayment ? 'partial' : 'empty';

  const dotColor =
    status === 'done' ? 'var(--color-accent)' : status === 'partial' ? 'var(--color-text-secondary)' : 'var(--color-border)';

  return (
    <button
      onClick={onClick}
      className="card-surface"
      style={{
        padding: '0.7rem 0.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.3rem',
        borderColor: selected ? 'var(--color-accent)' : 'var(--color-border)',
        boxShadow: selected ? '0 0 0 1px var(--color-accent)' : 'none',
      }}
    >
      <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{MONTH_LABELS[record.month - 1]}</span>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
      {hasPayment && (
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
          {record.amountPaid!.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
        </span>
      )}
    </button>
  );
}
