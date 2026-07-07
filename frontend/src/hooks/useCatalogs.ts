import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentMethodsApi, responsiblesApi } from '../api/catalogs';

function buildCatalogHooks(key: string, catalogApi: typeof paymentMethodsApi) {
  return {
    useList: () => useQuery({ queryKey: [key], queryFn: catalogApi.list }),
    useCreate: () => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (name: string) => catalogApi.create(name),
        onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
      });
    },
    useUpdate: () => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: ({ id, input }: { id: number; input: { name?: string; active?: boolean } }) =>
          catalogApi.update(id, input),
        onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
      });
    },
  };
}

export const paymentMethodsHooks = buildCatalogHooks('payment-methods', paymentMethodsApi);
export const responsiblesHooks = buildCatalogHooks('responsibles', responsiblesApi);
