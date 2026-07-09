import { useEffect, useState } from 'react';
import type { Bill, Unit } from '../../types/models';
import { useMonthlyRecords } from '../../hooks/useMonthlyRecords';
import { useTenants } from '../../hooks/useTenants';
import { BillHeaderForm } from './BillHeaderForm';
import { MonthGrid } from '../monthly/MonthGrid';
import { MonthDetailForm } from '../monthly/MonthDetailForm';
import { whatsappUrl, buildPaymentMessage } from '../../lib/whatsapp';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function unitLabel(unit: Unit): string {
  return unit.name || `${unit.address} #${unit.apartmentNo}`;
}

export function BillTab({ bill, unit }: { bill: Bill; unit: Unit }) {
  const year = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const { data: records, isLoading } = useMonthlyRecords(bill.id, year);
  const { data: tenants } = useTenants();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(currentMonth);

  useEffect(() => {
    setSelectedMonth(currentMonth);
  }, [bill.id]);

  const selectedRecord = records?.find((r) => r.month === selectedMonth) ?? null;
  const activeTenant = tenants?.find((t) => t.unitId === unit.id && !t.moveOutDate) ?? null;
  const isCurrentMonth = selectedMonth === currentMonth;

  const paymentUrl = bill.billType.paymentUrl;
  const currentMonthRecord = records?.find((r) => r.month === currentMonth) ?? null;
  const whatsappHref =
    activeTenant?.phone &&
    whatsappUrl(
      activeTenant.phone,
      buildPaymentMessage({
        tenantName: activeTenant.name,
        billType: bill.billType.name,
        unitLabel: unitLabel(unit),
        monthLabel: MONTH_NAMES[currentMonth - 1],
        year,
        amount: currentMonthRecord?.amountPaid ?? activeTenant.rentAmount ?? null,
        paymentUrl,
      })
    );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <BillHeaderForm bill={bill} unitId={unit.id} />

      {isCurrentMonth && (paymentUrl || whatsappHref) && (
        <div
          className="card-surface"
          style={{
            padding: '0.8rem 1rem',
            display: 'flex',
            gap: '0.6rem',
            flexWrap: 'wrap',
            alignItems: 'center',
            borderColor: 'var(--color-accent)',
          }}
        >
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginRight: 'auto' }}>
            {MONTH_NAMES[currentMonth - 1]} — mes actual
          </span>
          {paymentUrl && (
            <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              🌐 Pagar en línea
            </a>
          )}
          {whatsappHref ? (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn">
              🟢 Enviar por WhatsApp
            </a>
          ) : (
            !activeTenant && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                Agrega un inquilino con teléfono para habilitar WhatsApp
              </span>
            )
          )}
        </div>
      )}

      {isLoading && <div style={{ color: 'var(--color-text-secondary)' }}>Cargando meses…</div>}

      {records && (
        <MonthGrid records={records} selectedMonth={selectedMonth} onSelect={setSelectedMonth} />
      )}

      {selectedRecord && (
        <MonthDetailForm
          record={selectedRecord}
          billId={bill.id}
          year={year}
          billTypeName={bill.billType.name}
          defaultAmount={activeTenant?.rentAmount ?? null}
        />
      )}
    </div>
  );
}
