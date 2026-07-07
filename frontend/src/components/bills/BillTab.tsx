import { useEffect, useState } from 'react';
import type { Bill } from '../../types/models';
import { useMonthlyRecords } from '../../hooks/useMonthlyRecords';
import { BillHeaderForm } from './BillHeaderForm';
import { MonthGrid } from '../monthly/MonthGrid';
import { MonthDetailForm } from '../monthly/MonthDetailForm';

export function BillTab({ bill, unitId }: { bill: Bill; unitId: number }) {
  const year = new Date().getFullYear();
  const { data: records, isLoading } = useMonthlyRecords(bill.id, year);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(new Date().getMonth() + 1);

  useEffect(() => {
    setSelectedMonth(new Date().getMonth() + 1);
  }, [bill.id]);

  const selectedRecord = records?.find((r) => r.month === selectedMonth) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <BillHeaderForm bill={bill} unitId={unitId} />

      {isLoading && <div style={{ color: 'var(--color-text-secondary)' }}>Cargando meses…</div>}

      {records && (
        <MonthGrid records={records} selectedMonth={selectedMonth} onSelect={setSelectedMonth} />
      )}

      {selectedRecord && <MonthDetailForm record={selectedRecord} billId={bill.id} year={year} />}
    </div>
  );
}
