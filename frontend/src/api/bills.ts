import { api } from './client';
import type { Bill, BillType } from '../types/models';

export const billsApi = {
  listForUnit: (unitId: number) => api.get<Bill[]>(`/units/${unitId}/bills`),
  update: (id: number, input: { billNumber?: string | null; dueDate?: string | null }) =>
    api.put<Bill>(`/bills/${id}`, input),
};

export const billTypesApi = {
  list: () => api.get<BillType[]>('/bill-types'),
  create: (name: string) => api.post<BillType>('/bill-types', { name }),
  update: (id: number, input: Partial<Pick<BillType, 'name' | 'order' | 'active'>>) =>
    api.put<BillType>(`/bill-types/${id}`, input),
  remove: (id: number) => api.delete<void>(`/bill-types/${id}`),
};
