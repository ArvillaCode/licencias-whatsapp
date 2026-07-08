import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unitsApi, type UnitInput } from '../api/units';
import type { Unit } from '../types/models';

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

export function useReorderUnits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedUnits: Unit[]) => unitsApi.reorder(orderedUnits.map((u) => u.id)),
    onMutate: async (orderedUnits: Unit[]) => {
      await qc.cancelQueries({ queryKey: UNITS_KEY });
      const previous = qc.getQueryData<Unit[]>(UNITS_KEY);
      qc.setQueryData<Unit[]>(UNITS_KEY, orderedUnits);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(UNITS_KEY, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: UNITS_KEY }),
  });
}
