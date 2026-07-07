import { useState } from 'react';
import type { MonthlyRecord } from '../../types/models';
import { paymentMethodsHooks, responsiblesHooks } from '../../hooks/useCatalogs';
import { useDeleteEvidence, useUpdateMonthlyRecord, useUploadEvidence } from '../../hooks/useMonthlyRecords';
import { EvidenceUploader } from './EvidenceUploader';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function MonthDetailForm({ record, billId, year }: { record: MonthlyRecord; billId: number; year: number }) {
  const updateRecord = useUpdateMonthlyRecord(billId, year);
  const uploadEvidence = useUploadEvidence(billId, year);
  const deleteEvidence = useDeleteEvidence(billId, year);
  const { data: paymentMethods } = paymentMethodsHooks.useList();
  const { data: responsibles } = responsiblesHooks.useList();

  const [responsible, setResponsible] = useState(record.responsible ?? '');
  const [amountPaid, setAmountPaid] = useState(record.amountPaid?.toString() ?? '');
  const [paymentMethod, setPaymentMethod] = useState(record.paymentMethod ?? '');

  function save(partial: Partial<{ responsible: string; amountPaid: string; paymentMethod: string }>) {
    updateRecord.mutate({
      id: record.id,
      input: {
        responsible: partial.responsible ?? responsible,
        amountPaid: (partial.amountPaid ?? amountPaid) === '' ? null : Number(partial.amountPaid ?? amountPaid),
        paymentMethod: partial.paymentMethod ?? paymentMethod,
      },
    });
  }

  return (
    <div
      className="card-surface"
      style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>{MONTH_NAMES[record.month - 1]} {record.year}</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.9rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Responsable
          </span>
          <input
            className="input"
            list="responsibles-list"
            value={responsible}
            onChange={(e) => setResponsible(e.target.value)}
            onBlur={() => save({ responsible })}
          />
          <datalist id="responsibles-list">
            {responsibles?.map((r) => <option key={r.id} value={r.name} />)}
          </datalist>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Total pagado
          </span>
          <input
            className="input"
            type="number"
            step="0.01"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            onBlur={() => save({ amountPaid })}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Medio de pago
          </span>
          <input
            className="input"
            list="payment-methods-list"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            onBlur={() => save({ paymentMethod })}
          />
          <datalist id="payment-methods-list">
            {paymentMethods?.map((m) => <option key={m.id} value={m.name} />)}
          </datalist>
        </label>
      </div>

      <div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
          Evidencia fotográfica
        </div>
        <EvidenceUploader
          evidences={record.evidences}
          uploading={uploadEvidence.isPending}
          onUpload={(files) => uploadEvidence.mutate({ monthlyRecordId: record.id, files })}
          onDelete={(id) => deleteEvidence.mutate(id)}
        />
      </div>
    </div>
  );
}
