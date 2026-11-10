import { http } from '../../services/http';
import {
  Department,
  AnalyticsSummary,
  TimeseriesPoint,
  Hotspot,
  AlertItem
} from '../../types/api';

export const getDepartments = (): Promise<{ departments: Department[] }> =>
  http.get<{ departments: Department[] }>('/api/analytics/departments').then((r) => r.data);

export const getAnalyticsSummary = (params: {
  from?: string;
  to?: string;
  departmentId?: number | null;
}): Promise<AnalyticsSummary> =>
  http
    .get<AnalyticsSummary>('/api/analytics/summary', { params: cleanParams(params) })
    .then((r) => r.data);

export const getTimeseries = (params: {
  from?: string;
  to?: string;
  departmentId?: number | null;
}): Promise<{ timeseries: TimeseriesPoint[] }> =>
  http
    .get<{ timeseries: TimeseriesPoint[] }>('/api/analytics/timeseries', {
      params: cleanParams(params)
    })
    .then((r) => r.data);

export const getByDepartment = (params?: {
  month?: string;
}): Promise<{ month: string; departments: DepartmentComparison[] }> =>
  http
    .get<{ month: string; departments: DepartmentComparison[] }>('/api/analytics/by-department', {
      params
    })
    .then((r) => r.data);

export const getHotspots = (): Promise<{ hotspots: Hotspot[] }> =>
  http.get<{ hotspots: Hotspot[] }>('/api/analytics/hotspots').then((r) => r.data);

export const getAlerts = (params?: {
  status?: string;
  risk?: string;
  departmentId?: number | null;
}): Promise<{ alerts: AlertItem[] }> =>
  http
    .get<{ alerts: AlertItem[] }>('/api/alerts', { params: cleanParams(params) })
    .then((r) => r.data);

export const generateAlerts = (): Promise<{ message: string; count: number }> =>
  http.post<{ message: string; count: number }>('/api/alerts/generate').then((r) => r.data);

export const updateAlertStatus = (
  id: number,
  status: 'lido' | 'resolvido'
): Promise<AlertItem> =>
  http.patch<AlertItem>(`/api/alerts/${id}`, { status }).then((r) => r.data);

export const getPredictions = (): Promise<unknown> =>
  http.get('/api/predictions').then((r) => r.data);

// --- local types ---
export interface DepartmentComparison {
  DepartmentId: number;
  DepartmentName: string;
  AbsenceRate: number;
  OvertimePerEmployee: number;
  TurnoverRate: number;
}

// helper: remove null/undefined params so they don't get sent as "null" strings
function cleanParams(
  params?: Record<string, string | number | null | undefined>
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (!params) return out;
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined) out[k] = v;
  }
  return out;
}
