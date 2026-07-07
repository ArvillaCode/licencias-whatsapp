import { api } from './client';
import type { Evidence } from '../types/models';

export const evidenceApi = {
  listForRecord: (monthlyRecordId: number) => api.get<Evidence[]>(`/monthly-records/${monthlyRecordId}/evidence`),
  upload: (monthlyRecordId: number, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return api.post<Evidence[]>(`/monthly-records/${monthlyRecordId}/evidence`, formData);
  },
  remove: (id: number) => api.delete<void>(`/evidence/${id}`),
};
