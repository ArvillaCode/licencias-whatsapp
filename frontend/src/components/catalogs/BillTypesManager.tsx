import { useBillTypes, useCreateBillType, useUpdateBillType } from '../../hooks/useBills';
import { CatalogManager } from './CatalogManager';

export function BillTypesManager() {
  const { data, isLoading } = useBillTypes();
  const create = useCreateBillType();
  const update = useUpdateBillType();

  return (
    <div>
      <CatalogManager
        title="Tipos de Recibo/Gasto"
        items={data}
        isLoading={isLoading}
        onCreate={(name) => create.mutate(name)}
        onToggleActive={(item) => update.mutate({ id: item.id, input: { active: !item.active } })}
        onRename={(item, name) => update.mutate({ id: item.id, input: { name } })}
        createError={create.error}
        updateError={update.error}
      />
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', maxWidth: 520, marginTop: '0.75rem' }}>
        Al agregar un tipo nuevo se crea automáticamente ese recibo (vacío) en todas las unidades existentes.
      </p>

      {data && data.length > 0 && (
        <div className="card-surface" style={{ maxWidth: 520, marginTop: '1.25rem', padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ fontWeight: 600 }}>Enlaces de pago en línea</div>
          <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Cada tipo de recibo puede tener el enlace de pago en línea de la empresa. Se usará en el botón
            "Pagar en línea" del mes actual.
          </p>
          {data.map((type, i) => (
            <div key={type.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem 0', borderTop: i === 0 ? 'none' : '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{type.name}</span>

              <input
                className="input"
                type="url"
                placeholder="https://..."
                defaultValue={type.paymentUrl ?? ''}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (type.paymentUrl ?? '')) update.mutate({ id: type.id, input: { paymentUrl: v || null } });
                }}
              />

              <textarea
                className="input"
                placeholder="Instrucciones de pago (opcional)"
                rows={2}
                defaultValue={type.paymentInstructions ?? ''}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (type.paymentInstructions ?? ''))
                    update.mutate({ id: type.id, input: { paymentInstructions: v || null } });
                }}
              />

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  defaultChecked={type.sendToTenant}
                  onChange={(e) => update.mutate({ id: type.id, input: { sendToTenant: e.target.checked } })}
                />
                Enviar recordatorio al inquilino
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
