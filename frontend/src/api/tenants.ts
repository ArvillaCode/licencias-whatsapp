import { api } from './client';
import type { Tenant } from '../types/models';

export interface TenantInput {
  unitId: number;
  name: string;
  phone?: string | null;
  rentAmount?: number | null;
  rentDueDay?: number | null;
  contractStartDate?: string | null;
  notes?: string | null;
}

export const tenantsApi = {
  list: () => api.get<Tenant[]>('/tenants'),
  create: (input: TenantInput) => api.post<Tenant>('/tenants', input),
  update: (id: number, input: Partial<Omit<TenantInput, 'unitId'>>) => api.put<Tenant>(`/tenants/${id}`, input),
  end: (id: number) => api.post<Tenant>(`/tenants/${id}/end`),
  remove: (id: number) => api.delete<void>(`/tenants/${id}`),
};
