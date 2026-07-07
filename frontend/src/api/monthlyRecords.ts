import { api } from './client';
import type { MonthlyRecord } from '../types/models';

export interface MonthlyRecordInput {
  responsible?: string | null;
  amountPaid?: number | null;
  paymentMethod?: string | null;
  paidAt?: string | null;
  notes?: string | null;
}

export const monthlyRecordsApi = {
  listForBill: (billId: number, year: number) => api.get<MonthlyRecord[]>(`/bills/${billId}/monthly-records?year=${year}`),
  get: (id: number) => api.get<MonthlyRecord>(`/monthly-records/${id}`),
  update: (id: number, input: MonthlyRecordInput) => api.put<MonthlyRecord>(`/monthly-records/${id}`, input),
};
