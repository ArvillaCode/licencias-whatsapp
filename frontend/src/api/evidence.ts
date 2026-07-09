import { api } from './client';
import type { Evidence } from '../types/models';
import { compressImage } from '../lib/image';

export const evidenceApi = {
  listForRecord: (monthlyRecordId: number) => api.get<Evidence[]>(`/monthly-records/${monthlyRecordId}/evidence`),
  upload: async (monthlyRecordId: number, files: File[]) => {
    const compressed = await Promise.all(files.map((f) => compressImage(f)));
    const formData = new FormData();
    compressed.forEach((file) => formData.append('files', file));
    return api.post<Evidence[]>(`/monthly-records/${monthlyRecordId}/evidence`, formData);
  },
  remove: (id: number) => api.delete<void>(`/evidence/${id}`),
};
