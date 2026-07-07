import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard';

export function useDashboardSummary(year: number) {
  return useQuery({ queryKey: ['dashboard-summary', year], queryFn: () => dashboardApi.summary(year) });
}
