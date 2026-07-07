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
      />
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', maxWidth: 520, marginTop: '0.75rem' }}>
        Al agregar un tipo nuevo se crea automáticamente ese recibo (vacío) en todas las unidades existentes.
      </p>
    </div>
  );
}
