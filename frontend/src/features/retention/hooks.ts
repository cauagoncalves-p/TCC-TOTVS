// frontend/src/features/retention/hooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { retentionApi } from './api';
import {
  RetentionFilters,
  RetentionListResponse,
  RetentionSummary,
  RetentionModelConfig,
  RetentionEmployeeDetail,
  CreateFollowUpInput,
  FollowUpItem
} from './types';

/**
 * Consulta a lista paginada e filtrada de colaboradores
 * staleTime: 60s, sem pooling agressivo
 */
export function useRetentionList(filters?: RetentionFilters) {
  return useQuery<RetentionListResponse, Error>({
    queryKey: [
      'retention',
      'employees',
      filters?.scope || 'company',
      filters?.departmentId || '',
      filters?.level || '',
      filters?.q || '',
      filters?.onlySignals ? 'signals' : 'all',
      filters?.sort || 'score_desc',
      filters?.page || 1,
      filters?.limit || 25
    ],
    queryFn: () => retentionApi.getEmployees(filters),
    staleTime: 60000,
    refetchOnWindowFocus: false
  });
}

/**
 * Alias para compatibilidade
 */
export const useRetentionEmployees = useRetentionList;

/**
 * Consulta a contagem agregada de colaboradores por nível de atenção
 */
export function useRetentionSummary(params?: { scope?: string; departmentId?: number | string }) {
  return useQuery<RetentionSummary, Error>({
    queryKey: ['retention', 'summary', params?.scope || 'company', params?.departmentId || ''],
    queryFn: () => retentionApi.getSummary(params),
    staleTime: 60000,
    refetchOnWindowFocus: false
  });
}

/**
 * Consulta os detalhes completos de um colaborador para o painel lateral
 * REQUISITO DE PRIVACIDADE (PARTE5G):
 * staleTime: 0 e gcTime curto (5s) para não manter dados em cache após fechar o painel.
 */
export function useRetentionDetail(id: number | string | null | undefined) {
  return useQuery<RetentionEmployeeDetail, Error>({
    queryKey: ['retention', 'detail', id ? String(id) : ''],
    queryFn: () => retentionApi.getEmployeeDetail(id!),
    enabled: Boolean(id),
    staleTime: 0,
    gcTime: 5000, // limpa do cache logo após fechar
    refetchOnWindowFocus: false
  });
}

/**
 * Consulta parâmetros e regras do cálculo (transparência e explicabilidade)
 */
export function useRetentionConfig() {
  return useQuery<RetentionModelConfig, Error>({
    queryKey: ['retention', 'config'],
    queryFn: () => retentionApi.getConfig(),
    staleTime: 300000,
    refetchOnWindowFocus: false
  });
}

/**
 * Mutação para recálculo manual do índice de atenção
 */
export function useRecalculate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => retentionApi.recalculate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retention'] });
    }
  });
}

/**
 * Mutação para registrar uma ação de acompanhamento
 */
export function useAddFollowUp(employeeId: number | string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateFollowUpInput) => retentionApi.addFollowUp(employeeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retention', 'detail', String(employeeId)] });
      queryClient.invalidateQueries({ queryKey: ['retention', 'employees'] });
    }
  });
}
