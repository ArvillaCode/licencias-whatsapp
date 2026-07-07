import type { MonthlyRecord } from '../../types/models';
import { MonthCard } from './MonthCard';

export function MonthGrid({
  records,
  selectedMonth,
  onSelect,
}: {
  records: MonthlyRecord[];
  selectedMonth: number | null;
  onSelect: (month: number) => void;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
        gap: '0.6rem',
      }}
    >
      {records.map((record) => (
        <MonthCard
          key={record.id}
          record={record}
          selected={record.month === selectedMonth}
          onClick={() => onSelect(record.month)}
        />
      ))}
    </div>
  );
}
