// frontend/src/features/onboarding/api.ts
import http from '../../services/http';
import {
  OnboardingCaseSummary,
  OnboardingCaseDetail,
  OnboardingApprovalResult,
  OnboardingRejectResult,
  CandidateData,
  ValidateCadastroResponse
} from './types';
import { cleanDigits, parseCurrencyValue } from './utils/masks';

/**
 * Sanitiza os dados do cadastro antes do envio:
 * Envia CPF e CEP estritamente com dígitos e converte salário para formato numérico
 */
export function sanitizeCadastroPayload(data: Partial<CandidateData>): CandidateData {
  const result: CandidateData = {
    fullName: data.fullName ? data.fullName.trim() : '',
    cpf: cleanDigits(data.cpf),
    rg: data.rg ? data.rg.trim() : '',
    birthDate: data.birthDate ? String(data.birthDate).split('T')[0] : '',
    email: data.email ? data.email.trim() : '',
    phone: data.phone ? data.phone.trim() : '',
    zipCode: cleanDigits(data.zipCode),
    street: data.street ? data.street.trim() : '',
    city: data.city ? data.city.trim() : '',
    state: data.state ? data.state.trim().toUpperCase() : '',
    jobTitle: data.jobTitle ? data.jobTitle.trim() : '',
    department: data.department ? data.department.trim() : '',
    hireDate: data.hireDate ? String(data.hireDate).split('T')[0] : '',
    baseSalary: data.baseSalary !== undefined && data.baseSalary !== ''
      ? (typeof data.baseSalary === 'number' ? data.baseSalary : parseCurrencyValue(data.baseSalary))
      : undefined
  };

  return result;
}

/**
 * Lista os casos de onboarding cadastrados, com filtro opcional por status
 */
export const getOnboardingCases = async (status?: string): Promise<{ cases: OnboardingCaseSummary[] }> => {
  const params = status && status !== 'todos' ? { status } : {};
  const response = await http.get<{ cases: OnboardingCaseSummary[] }>('/api/onboarding', { params });
  return response.data;
};

/**
 * Obtém os detalhes completos de um caso de onboarding
 */
export const getOnboardingCaseById = async (id: number): Promise<OnboardingCaseDetail> => {
  const response = await http.get<OnboardingCaseDetail>(`/api/onboarding/${id}`);
  return response.data;
};

/**
 * Cria um caso de onboarding manualmente sem documento PDF (salva rascunho)
 */
export const createManualOnboardingCase = async (payload: {
  cadastro: Partial<CandidateData>;
  perfil?: any;
}): Promise<OnboardingCaseDetail> => {
  const sanitizedCadastro = sanitizeCadastroPayload(payload.cadastro);
  const response = await http.post<OnboardingCaseDetail>('/api/onboarding', {
    cadastro: sanitizedCadastro,
    perfil: payload.perfil || null
  });
  return response.data;
};

/**
 * Validação de dados cadastrais em tempo real sem gravar nada no banco
 */
export const validateOnboardingCadastro = async (
  cadastro: Partial<CandidateData>,
  signal?: AbortSignal
): Promise<ValidateCadastroResponse> => {
  const sanitizedCadastro = sanitizeCadastroPayload(cadastro);
  const response = await http.post<ValidateCadastroResponse>(
    '/api/onboarding/validate',
    { cadastro: sanitizedCadastro },
    { signal }
  );
  return response.data;
};

/**
 * Atualiza os dados revisados pelo analista de DP/RH e revalida (Salvar rascunho / correções)
 */
export const updateOnboardingCase = async (
  id: number,
  payload: { cadastro: Partial<CandidateData>; perfil?: any } | Partial<CandidateData>
): Promise<OnboardingCaseDetail> => {
  let body: any;
  if ('cadastro' in payload) {
    body = {
      cadastro: sanitizeCadastroPayload(payload.cadastro),
      perfil: payload.perfil || null
    };
  } else {
    body = {
      cadastro: sanitizeCadastroPayload(payload),
      perfil: null
    };
  }

  const response = await http.put<OnboardingCaseDetail>(`/api/onboarding/${id}`, body);
  return response.data;
};

/**
 * Envia um arquivo PDF para extração estruturada de dados via IA (Fase F2b)
 */
export const uploadOnboardingFile = async (
  file: File,
  documentType?: string
): Promise<OnboardingCaseDetail> => {
  const formData = new FormData();
  formData.append('file', file);
  if (documentType) {
    formData.append('documentType', documentType);
  }

  const response = await http.post<OnboardingCaseDetail>('/api/onboarding/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

/**
 * Lista tipos de documentos suportados pelo sistema de IA
 */
export const getDocumentTypes = async (): Promise<{ types: Array<{ code: string; label: string; description: string }> }> => {
  const response = await http.get<{ types: Array<{ code: string; label: string; description: string }> }>(
    '/api/onboarding/document-types'
  );
  return response.data;
};

/**
 * Aprova o caso de admissão, gerando colaborador, usuário e matrícula
 */
export const approveOnboardingCase = async (id: number): Promise<OnboardingApprovalResult> => {
  const response = await http.post<OnboardingApprovalResult>(`/api/onboarding/${id}/approve`);
  return response.data;
};

/**
 * Rejeita o caso de admissão, registrando o motivo obrigatório
 */
export const rejectOnboardingCase = async (
  id: number,
  reason: string
): Promise<OnboardingRejectResult> => {
  const response = await http.post<OnboardingRejectResult>(`/api/onboarding/${id}/reject`, { reason });
  return response.data;
};
