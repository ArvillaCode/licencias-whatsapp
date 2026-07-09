import { useEffect, useState } from 'react';
import type { MonthlyRecord } from '../../types/models';
import { paymentMethodsHooks, responsiblesHooks } from '../../hooks/useCatalogs';
import { useDeleteEvidence, useUpdateMonthlyRecord, useUploadEvidence } from '../../hooks/useMonthlyRecords';
import { useAuth } from '../../contexts/AuthContext';
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
  const { user, isAdmin } = useAuth();

  // El usuario (no admin) siempre queda como responsable con su propio nombre.
  const forcedResponsible = isAdmin ? null : user?.name ?? '';

  const [paidAt, setPaidAt] = useState(record.paidAt ? record.paidAt.slice(0, 10) : '');
  const [responsible, setResponsible] = useState(forcedResponsible ?? record.responsible ?? '');
  const [amountPaid, setAmountPaid] = useState(record.amountPaid?.toString() ?? '');
  const [paymentMethod, setPaymentMethod] = useState(record.paymentMethod ?? '');
  const [justSaved, setJustSaved] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setPaidAt(record.paidAt ? record.paidAt.slice(0, 10) : '');
    setResponsible(forcedResponsible ?? record.responsible ?? '');
    setAmountPaid(record.amountPaid?.toString() ?? '');
    setPaymentMethod(record.paymentMethod ?? '');
    setJustSaved(false);
    setValidationError(null);
  }, [record.id]);

  const dirty =
    paidAt !== (record.paidAt ? record.paidAt.slice(0, 10) : '') ||
    responsible !== (record.responsible ?? '') ||
    amountPaid !== (record.amountPaid?.toString() ?? '') ||
    paymentMethod !== (record.paymentMethod ?? '');

  function handleSave() {
    const missing: string[] = [];
    if (!paidAt) missing.push('Fecha de pago');
    if (!responsible.trim()) missing.push('Responsable');
    if (amountPaid === '') missing.push('Total pagado');
    if (!paymentMethod.trim()) missing.push('Medio de pago');

    if (missing.length > 0) {
      setValidationError(`Completa los campos obligatorios: ${missing.join(', ')}.`);
      return;
    }
    setValidationError(null);

    updateRecord.mutate(
      {
        id: record.id,
        input: {
          paidAt: paidAt || null,
          responsible,
          amountPaid: amountPaid === '' ? null : Number(amountPaid),
          paymentMethod,
        },
      },
      {
        onSuccess: () => {
          setJustSaved(true);
          setTimeout(() => setJustSaved(false), 2000);
        },
      }
    );
  }

  return (
    <div
      className="card-surface"
      style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>{MONTH_NAMES[record.month - 1]} {record.year}</h3>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxWidth: 220 }}>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-accent)', textTransform: 'uppercase', fontWeight: 600 }}>
          📅 Fecha de pago *
        </span>
        <input
          className="input"
          type="date"
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.9rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Responsable * {!isAdmin && <span style={{ textTransform: 'none' }}>(tú)</span>}
          </span>
          <input
            className="input"
            list={isAdmin ? 'responsibles-list' : undefined}
            value={responsible}
            onChange={(e) => setResponsible(e.target.value)}
            disabled={!isAdmin}
            title={!isAdmin ? 'El responsable eres tú y no se puede cambiar' : undefined}
          />
          {isAdmin && (
            <datalist id="responsibles-list">
              {responsibles?.filter((r) => r.active).map((r) => <option key={r.id} value={r.name} />)}
            </datalist>
          )}
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Total pagado *
          </span>
          <input
            className="input"
            type="number"
            step="0.01"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Medio de pago *
          </span>
          <input
            className="input"
            list="payment-methods-list"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
          <datalist id="payment-methods-list">
            {paymentMethods?.filter((m) => m.active).map((m) => <option key={m.id} value={m.name} />)}
          </datalist>
        </label>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!dirty || updateRecord.isPending}
          >
            {updateRecord.isPending ? 'Guardando…' : 'Guardar'}
          </button>
          {justSaved && (
            <span style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-sm)' }}>✓ Guardado</span>
          )}
        </div>
        {validationError && (
          <div style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>⚠ {validationError}</div>
        )}
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
