import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tenantsApi, type TenantInput } from '../api/tenants';

export const TENANTS_KEY = ['tenants'];

export function useTenants() {
  return useQuery({ queryKey: TENANTS_KEY, queryFn: tenantsApi.list });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TenantInput) => tenantsApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TENANTS_KEY });
      qc.invalidateQueries({ queryKey: ['bills'] });
    },
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<Omit<TenantInput, 'unitId'>> }) =>
      tenantsApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TENANTS_KEY });
      qc.invalidateQueries({ queryKey: ['bills'] });
    },
  });
}

export function useEndTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tenantsApi.end(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TENANTS_KEY }),
  });
}

export function useDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tenantsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TENANTS_KEY }),
  });
}
