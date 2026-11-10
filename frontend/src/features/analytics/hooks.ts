import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDepartments,
  getAnalyticsSummary,
  getTimeseries,
  getByDepartment,
  getHotspots,
  getAlerts,
  generateAlerts,
  updateAlertStatus,
  getPredictions
} from './api';

// ─── Filter state shape ───────────────────────────────────────────────────────
export interface AnalyticsFilters {
  from: string;
  to: string;
  departmentId: number | null;
}

function defaultFilters(): AnalyticsFilters {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const from12 = new Date(now);
  from12.setMonth(from12.getMonth() - 11);
  from12.setDate(1);
  const from = from12.toISOString().slice(0, 10);
  return { from, to, departmentId: null };
}
export { defaultFilters };

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useDepartments() {
  return useQuery({
    queryKey: ['analytics', 'departments'],
    queryFn: getDepartments,
    staleTime: 1000 * 60 * 10
  });
}

export function useAnalyticsSummary(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics', 'summary', filters],
    queryFn: () =>
      getAnalyticsSummary({
        from: filters.from,
        to: filters.to,
        departmentId: filters.departmentId
      }),
    staleTime: 1000 * 60 * 5
  });
}

export function useTimeseries(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics', 'timeseries', filters],
    queryFn: () =>
      getTimeseries({
        from: filters.from,
        to: filters.to,
        departmentId: filters.departmentId
      }),
    staleTime: 1000 * 60 * 5
  });
}

export function useByDepartment(month?: string) {
  return useQuery({
    queryKey: ['analytics', 'by-department', month],
    queryFn: () => getByDepartment({ month }),
    staleTime: 1000 * 60 * 5
  });
}

export function useHotspots() {
  return useQuery({
    queryKey: ['analytics', 'hotspots'],
    queryFn: getHotspots,
    staleTime: 1000 * 60 * 5
  });
}

export interface AlertFilters {
  status?: string;
  risk?: string;
  departmentId?: number | null;
}

export function useAlerts(filters?: AlertFilters) {
  return useQuery({
    queryKey: ['analytics', 'alerts', filters],
    queryFn: () => getAlerts(filters),
    staleTime: 1000 * 60 * 2
  });
}

export function usePredictions() {
  return useQuery({
    queryKey: ['analytics', 'predictions'],
    queryFn: getPredictions,
    retry: false,
    staleTime: 1000 * 60 * 10
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useGenerateAlerts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: generateAlerts,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['analytics', 'alerts'] });
      qc.invalidateQueries({ queryKey: ['analytics', 'summary'] });
      qc.invalidateQueries({ queryKey: ['analytics', 'hotspots'] });
    }
  });
}

export function useUpdateAlertStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'lido' | 'resolvido' }) =>
      updateAlertStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['analytics', 'alerts'] });
      qc.invalidateQueries({ queryKey: ['analytics', 'summary'] });
    }
  });
}
