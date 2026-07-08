import { responsiblesHooks } from '../../hooks/useCatalogs';
import { CatalogManager } from './CatalogManager';

export function ResponsiblesManager() {
  const { data, isLoading } = responsiblesHooks.useList();
  const create = responsiblesHooks.useCreate();
  const update = responsiblesHooks.useUpdate();

  return (
    <CatalogManager
      title="Responsables Frecuentes"
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
