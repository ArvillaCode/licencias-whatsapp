import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unitsApi, type UnitInput } from '../api/units';

export const UNITS_KEY = ['units'];

export function useUnits() {
  return useQuery({ queryKey: UNITS_KEY, queryFn: unitsApi.list });
}

export function useCreateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UnitInput) => unitsApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: UNITS_KEY }),
  });
}

export function useUpdateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<UnitInput> }) => unitsApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: UNITS_KEY }),
  });
}

export function useDeleteUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unitsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: UNITS_KEY }),
  });
}
