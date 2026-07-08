import { paymentMethodsHooks } from '../../hooks/useCatalogs';
import { CatalogManager } from './CatalogManager';

export function PaymentMethodsManager() {
  const { data, isLoading } = paymentMethodsHooks.useList();
  const create = paymentMethodsHooks.useCreate();
  const update = paymentMethodsHooks.useUpdate();

  return (
    <CatalogManager
      title="Medios de Pago"
      items={data}
      isLoading={isLoading}
      onCreate={(name) => create.mutate(name)}
      onToggleActive={(item) => update.mutate({ id: item.id, input: { active: !item.active } })}
      onRename={(item, name) => update.mutate({ id: item.id, input: { name } })}
      createError={create.error}
      updateError={update.error}
    />
  );
}
