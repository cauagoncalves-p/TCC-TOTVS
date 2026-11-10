import { http } from '../../services/http';
import {
  ComplianceRule,
  ComplianceIssue,
  EsocialEvent,
  ComplianceRun,
  ComplianceAuditLogItem
} from '../../types/api';

function cleanParams(
  params?: Record<string, string | number | boolean | null | undefined>
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!params) return out;
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== '') out[k] = v;
  }
  return out;
}

export const getComplianceRules = (params?: {
  category?: string;
  isActive?: boolean;
}): Promise<{ rules: ComplianceRule[] }> =>
  http
    .get<{ rules: ComplianceRule[] }>('/api/compliance/rules', {
      params: cleanParams(params)
    })
    .then((r) => r.data);

export const executeComplianceRun = (body: {
  scope: 'cadastros' | 'esocial';
  eventCode?: string;
}): Promise<{
  runId: number;
  scope: string;
  eventCode?: string | null;
  recordsAnalyzed: number;
  issuesNew: number;
  issuesOpen: number;
  finishedAt: string;
}> => http.post('/api/compliance/runs', body).then((r) => r.data);

export const getComplianceRuns = (params?: {
  limit?: number;
}): Promise<{ runs: ComplianceRun[] }> =>
  http
    .get<{ runs: ComplianceRun[] }>('/api/compliance/runs', {
      params: cleanParams(params)
    })
    .then((r) => r.data);

export const getComplianceIssues = (params?: {
  status?: string;
  priority?: string;
  eventCode?: string;
  employeeId?: number;
  department?: string;
}): Promise<{ issues: ComplianceIssue[] }> =>
  http
    .get<{ issues: ComplianceIssue[] }>('/api/compliance/issues', {
      params: cleanParams(params)
    })
    .then((r) => r.data);

export const updateIssueStatus = (
  id: number,
  body: {
    status: 'corrigida' | 'ignorada';
    resolutionNote?: string;
  }
): Promise<ComplianceIssue> =>
  http.patch<ComplianceIssue>(`/api/compliance/issues/${id}`, body).then((r) => r.data);

export const getEsocialEvents = (params?: {
  status?: string;
  eventCode?: string;
}): Promise<{ events: EsocialEvent[] }> =>
  http
    .get<{ events: EsocialEvent[] }>('/api/compliance/esocial/events', {
      params: cleanParams(params)
    })
    .then((r) => r.data);

export const confirmEsocialEvent = (
  id: number
): Promise<{ message: string; event: EsocialEvent }> =>
  http.post<{ message: string; event: EsocialEvent }>(`/api/compliance/esocial/events/${id}/confirm`).then((r) => r.data);

export const getAuditLog = (params?: {
  limit?: number;
  offset?: number;
}): Promise<{
  total: number;
  limit: number;
  offset: number;
  logs: ComplianceAuditLogItem[];
}> =>
  http
    .get<{
      total: number;
      limit: number;
      offset: number;
      logs: ComplianceAuditLogItem[];
    }>('/api/compliance/audit-log', {
      params: cleanParams(params)
    })
    .then((r) => r.data);
