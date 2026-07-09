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
          {data.map((type) => (
            <label key={type.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
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
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
