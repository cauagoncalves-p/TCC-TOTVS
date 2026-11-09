import http from '../../services/http';
import {
  OnboardingCaseSummary,
  OnboardingCaseDetail,
  OnboardingApprovalResult,
  OnboardingRejectResult,
  CandidateData
} from '../../types/api';

/**
 * Envia um arquivo PDF para extração estruturada de dados via IA.
 */
export const uploadOnboardingFile = async (file: File): Promise<OnboardingCaseDetail> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await http.post<OnboardingCaseDetail>('/api/onboarding/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

/**
 * Lista os casos de admissão cadastrados, com filtro opcional por status.
 */
export const getOnboardingCases = async (status?: string): Promise<{ cases: OnboardingCaseSummary[] }> => {
  const params = status && status !== 'todos' ? { status } : {};
  const response = await http.get<{ cases: OnboardingCaseSummary[] }>('/api/onboarding', { params });
  return response.data;
};

/**
 * Obtém os detalhes completos de um caso de onboarding.
 */
export const getOnboardingCaseById = async (id: number): Promise<OnboardingCaseDetail> => {
  const response = await http.get<OnboardingCaseDetail>(`/api/onboarding/${id}`);
  return response.data;
};

/**
 * Atualiza os dados revisados pelo analista de DP/RH e revalida.
 */
export const updateOnboardingCase = async (
  id: number,
  data: CandidateData
): Promise<OnboardingCaseDetail> => {
  const response = await http.put<OnboardingCaseDetail>(`/api/onboarding/${id}`, data);
  return response.data;
};

/**
 * Aprova o caso de admissão, gerando colaborador, usuário e matrícula.
 */
export const approveOnboardingCase = async (id: number): Promise<OnboardingApprovalResult> => {
  const response = await http.post<OnboardingApprovalResult>(`/api/onboarding/${id}/approve`);
  return response.data;
};

/**
 * Rejeita o caso de admissão, registrando o motivo obrigatório.
 */
export const rejectOnboardingCase = async (
  id: number,
  reason: string
): Promise<OnboardingRejectResult> => {
  const response = await http.post<OnboardingRejectResult>(`/api/onboarding/${id}/reject`, { reason });
  return response.data;
};
