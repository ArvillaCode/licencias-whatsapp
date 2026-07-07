import { api } from './client';
import type { DashboardSummary } from '../types/models';

export const dashboardApi = {
  summary: (year: number) => api.get<DashboardSummary>(`/dashboard/summary?year=${year}`),
};
