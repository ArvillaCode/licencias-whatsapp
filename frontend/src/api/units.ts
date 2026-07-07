import { api } from './client';
import type { Unit } from '../types/models';

export interface UnitInput {
  address: string;
  apartmentNo: string;
  name?: string | null;
  tenantName?: string | null;
}

export const unitsApi = {
  list: () => api.get<Unit[]>('/units'),
  get: (id: number) => api.get<Unit>(`/units/${id}`),
  create: (input: UnitInput) => api.post<Unit>('/units', input),
  update: (id: number, input: Partial<UnitInput>) => api.put<Unit>(`/units/${id}`, input),
  remove: (id: number) => api.delete<void>(`/units/${id}`),
};
