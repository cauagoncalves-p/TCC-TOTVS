import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getComplianceRules,
  executeComplianceRun,
  getComplianceRuns,
  getComplianceIssues,
  updateIssueStatus,
  getEsocialEvents,
  confirmEsocialEvent,
  getAuditLog
} from './api';

export function useComplianceRules(category?: string, isActive?: boolean) {
  return useQuery({
    queryKey: ['compliance', 'rules', category, isActive],
    queryFn: () => getComplianceRules({ category, isActive }),
    staleTime: 1000 * 60 * 10
  });
}

export function useComplianceRuns(limit = 20) {
  return useQuery({
    queryKey: ['compliance', 'runs', limit],
    queryFn: () => getComplianceRuns({ limit }),
    staleTime: 1000 * 60 * 2
  });
}

export interface IssueFilterParams {
  status?: string;
  priority?: string;
  eventCode?: string;
  employeeId?: number;
  department?: string;
}

export function useComplianceIssues(filters?: IssueFilterParams) {
  return useQuery({
    queryKey: ['compliance', 'issues', filters],
    queryFn: () => getComplianceIssues(filters),
    staleTime: 1000 * 60 * 2
  });
}

export function useEsocialEvents(filters?: { status?: string; eventCode?: string }) {
  return useQuery({
    queryKey: ['compliance', 'esocial', filters],
    queryFn: () => getEsocialEvents(filters),
    staleTime: 1000 * 60 * 2
  });
}

export function useAuditLog(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['compliance', 'audit-log', params],
    queryFn: () => getAuditLog(params),
    staleTime: 1000 * 60 * 2
  });
}

// Mutations
export function useExecuteComplianceRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: executeComplianceRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance'] });
    }
  });
}

export function useUpdateIssueStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      resolutionNote
    }: {
      id: number;
      status: 'corrigida' | 'ignorada';
      resolutionNote?: string;
    }) => updateIssueStatus(id, { status, resolutionNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'issues'] });
      queryClient.invalidateQueries({ queryKey: ['compliance', 'audit-log'] });
    }
  });
}

export function useConfirmEsocialEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => confirmEsocialEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', 'esocial'] });
      queryClient.invalidateQueries({ queryKey: ['compliance', 'audit-log'] });
    }
  });
}
