import { useState, type FormEvent } from 'react';
import { useUnits } from '../../hooks/useUnits';
import { useTenants, useCreateTenant, useUpdateTenant, useEndTenant, useDeleteTenant } from '../../hooks/useTenants';
import { ApiError } from '../../api/client';
import { formatCOP } from '../../lib/currency';
import type { Tenant, Unit } from '../../types/models';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado.';
}

function unitLabel(unit: Unit): string {
  return unit.name || `${unit.address} #${unit.apartmentNo}`;
}

interface TenantFormValue {
  name: string;
  phone: string;
  rentAmount: string;
  rentDueDay: string;
  contractStartDate: string;
  notes: string;
}

const EMPTY_FORM: TenantFormValue = { name: '', phone: '', rentAmount: '', rentDueDay: '', contractStartDate: '', notes: '' };

function tenantToForm(t: Tenant): TenantFormValue {
  return {
    name: t.name,
    phone: t.phone ?? '',
    rentAmount: t.rentAmount != null ? String(t.rentAmount) : '',
    rentDueDay: t.rentDueDay != null ? String(t.rentDueDay) : '',
    contractStartDate: t.contractStartDate ? t.contractStartDate.slice(0, 10) : '',
    notes: t.notes ?? '',
  };
}

function TenantForm({
  initial,
  submitLabel,
  pending,
  onCancel,
  onSubmit,
}: {
  initial: TenantFormValue;
  submitLabel: string;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (value: TenantFormValue) => void;
}) {
  const [value, setValue] = useState(initial);

  function set<K extends keyof TenantFormValue>(key: K, v: TenantFormValue[K]) {
    setValue((prev) => ({ ...prev, [key]: v }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.name.trim()) return;
    onSubmit(value);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.9rem', background: 'var(--color-bg)', borderRadius: 8, border: '1px solid var(--color-border)' }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.6rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Nombre *</span>
          <input className="input" value={value.name} onChange={(e) => set('name', e.target.value)} required autoFocus />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Teléfono (WhatsApp)</span>
          <input className="input" placeholder="3001234567" value={value.phone} onChange={(e) => set('phone', e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Monto del arriendo</span>
          <input className="input" type="number" step="0.01" value={value.rentAmount} onChange={(e) => set('rentAmount', e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Día de pago</span>
          <select className="input" value={value.rentDueDay} onChange={(e) => set('rentDueDay', e.target.value)}>
            <option value="">Sin definir</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                Día {d}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Inicio de contrato</span>
          <input className="input" type="date" value={value.contractStartDate} onChange={(e) => set('contractStartDate', e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', gridColumn: '1 / -1' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Notas</span>
          <input className="input" value={value.notes} onChange={(e) => set('notes', e.target.value)} />
        </label>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button type="button" className="btn" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function UnitTenantCard({ unit, active, history }: { unit: Unit; active: Tenant | null; history: Tenant[] }) {
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const endTenant = useEndTenant();
  const deleteTenant = useDeleteTenant();

  const [mode, setMode] = useState<'idle' | 'create' | 'edit'>('idle');
  const [showHistory, setShowHistory] = useState(false);

  const actionError = errorMessage(createTenant.error || updateTenant.error || endTenant.error || deleteTenant.error);

  async function handleCreate(value: TenantFormValue) {
    await createTenant.mutateAsync({
      unitId: unit.id,
      name: value.name.trim(),
      phone: value.phone.trim() || null,
      rentAmount: value.rentAmount === '' ? null : Number(value.rentAmount),
      rentDueDay: value.rentDueDay === '' ? null : Number(value.rentDueDay),
      contractStartDate: value.contractStartDate || null,
      notes: value.notes.trim() || null,
    });
    setMode('idle');
  }

  async function handleEdit(value: TenantFormValue) {
    if (!active) return;
    await updateTenant.mutateAsync({
      id: active.id,
      input: {
        name: value.name.trim(),
        phone: value.phone.trim() || null,
        rentAmount: value.rentAmount === '' ? null : Number(value.rentAmount),
        rentDueDay: value.rentDueDay === '' ? null : Number(value.rentDueDay),
        contractStartDate: value.contractStartDate || null,
        notes: value.notes.trim() || null,
      },
    });
    setMode('idle');
  }

  return (
    <div className="card-surface" style={{ padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ fontWeight: 700 }}>{unitLabel(unit)}</div>
        {active && mode === 'idle' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn" onClick={() => setMode('edit')}>
              Editar
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                if (confirm(`¿Finalizar el contrato de ${active.name}?`)) endTenant.mutate(active.id);
              }}
            >
              Finalizar contrato
            </button>
          </div>
        )}
        {!active && mode === 'idle' && (
          <button className="btn btn-primary" onClick={() => setMode('create')}>
            + Agregar inquilino
          </button>
        )}
      </div>

      {active && mode === 'idle' && (
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: 'var(--font-size-sm)' }}>
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Nombre</div>
            <div style={{ fontWeight: 600 }}>{active.name}</div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Teléfono</div>
            <div>{active.phone || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Arriendo</div>
            <div>{active.rentAmount != null ? formatCOP(active.rentAmount) : '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Día de pago</div>
            <div>{active.rentDueDay ? `Día ${active.rentDueDay}` : '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Contrato desde</div>
            <div>{active.contractStartDate ? active.contractStartDate.slice(0, 10) : '—'}</div>
          </div>
        </div>
      )}

      {!active && mode === 'idle' && <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Sin inquilino asignado.</div>}

      {mode === 'create' && (
        <TenantForm initial={EMPTY_FORM} submitLabel="Agregar inquilino" pending={createTenant.isPending} onCancel={() => setMode('idle')} onSubmit={handleCreate} />
      )}
      {mode === 'edit' && active && (
        <TenantForm initial={tenantToForm(active)} submitLabel="Guardar cambios" pending={updateTenant.isPending} onCancel={() => setMode('idle')} onSubmit={handleEdit} />
      )}
      {actionError && <div style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>{actionError}</div>}

      {history.length > 0 && (
        <div>
          <button
            className="btn"
            style={{ fontSize: 'var(--font-size-xs)', padding: '0.3rem 0.6rem' }}
            onClick={() => setShowHistory((s) => !s)}
          >
            {showHistory ? 'Ocultar' : 'Ver'} historial ({history.length})
          </button>
          {showHistory && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
              {history.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                    padding: '0.4rem 0.6rem',
                    background: 'var(--color-bg)',
                    borderRadius: 6,
                  }}
                >
                  <span>
                    {t.name} {t.phone ? `· ${t.phone}` : ''} — {t.contractStartDate ? t.contractStartDate.slice(0, 10) : '?'} a{' '}
                    {t.moveOutDate ? t.moveOutDate.slice(0, 10) : '?'}
                  </span>
                  <button
                    className="btn"
                    style={{ padding: '0.2rem 0.5rem' }}
                    onClick={() => {
                      if (confirm('¿Eliminar este registro del historial?')) deleteTenant.mutate(t.id);
                    }}
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TenantsManager() {
  const { data: units, isLoading: loadingUnits } = useUnits();
  const { data: tenants, isLoading: loadingTenants } = useTenants();

  return (
    <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 900 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 'var(--font-size-2xl)' }}>Inquilinos</h1>
        <p style={{ margin: '0.2rem 0 0', color: 'var(--color-text-secondary)' }}>
          Nombre, teléfono y día de pago del arriendo por unidad. El día de pago fija automáticamente el
          vencimiento del recibo de Arriendo.
        </p>
      </div>

      {(loadingUnits || loadingTenants) && <div style={{ color: 'var(--color-text-secondary)' }}>Cargando…</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        {units?.map((unit) => {
          const forUnit = tenants?.filter((t) => t.unitId === unit.id) ?? [];
          const active = forUnit.find((t) => !t.moveOutDate) ?? null;
          const history = forUnit
            .filter((t) => t.moveOutDate)
            .sort((a, b) => new Date(b.moveOutDate!).getTime() - new Date(a.moveOutDate!).getTime());
          return <UnitTenantCard key={unit.id} unit={unit} active={active} history={history} />;
        })}
      </div>
    </div>
  );
}
