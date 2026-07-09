import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { billsApi, billTypesApi } from '../api/bills';

export function useBillsForUnit(unitId: number) {
  return useQuery({ queryKey: ['bills', unitId], queryFn: () => billsApi.listForUnit(unitId) });
}

export function useUpdateBill(unitId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: { billNumber?: string | null; dueDay?: number | null } }) =>
      billsApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bills', unitId] }),
  });
}

export const BILL_TYPES_KEY = ['bill-types'];

export function useBillTypes() {
  return useQuery({ queryKey: BILL_TYPES_KEY, queryFn: billTypesApi.list });
}

export function useCreateBillType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => billTypesApi.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: BILL_TYPES_KEY }),
  });
}

export function useUpdateBillType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: { name?: string; active?: boolean; order?: number; paymentUrl?: string | null } }) =>
      billTypesApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: BILL_TYPES_KEY }),
  });
}

export function useDeleteBillType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => billTypesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: BILL_TYPES_KEY }),
  });
}
