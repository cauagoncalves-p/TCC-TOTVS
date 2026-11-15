// frontend/src/features/onboarding/hooks.ts
import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOnboardingCases,
  getOnboardingCaseById,
  createManualOnboardingCase,
  updateOnboardingCase,
  uploadOnboardingFile,
  validateOnboardingCadastro,
  approveOnboardingCase,
  rejectOnboardingCase
} from './api';
import {
  CandidateData,
  ValidateCadastroResponse,
  OnboardingCaseDetail
} from './types';

export const useOnboardingCases = (status?: string) => {
  return useQuery({
    queryKey: ['onboardingCases', status],
    queryFn: () => getOnboardingCases(status),
    staleTime: 1000 * 30 // 30 segundos
  });
};

export const useOnboardingCase = (id?: number) => {
  return useQuery({
    queryKey: ['onboardingCase', id],
    queryFn: () => getOnboardingCaseById(id!),
    enabled: !!id && !isNaN(id),
    staleTime: 1000 * 10
  });
};

export const useCreateManualOnboarding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { cadastro: Partial<CandidateData>; perfil?: any }) =>
      createManualOnboardingCase(payload),
    onSuccess: (newCase) => {
      queryClient.setQueryData(['onboardingCase', newCase.id], newCase);
      queryClient.invalidateQueries({ queryKey: ['onboardingCases'] });
    }
  });
};

export const useUpdateOnboarding = (caseId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { cadastro: Partial<CandidateData>; perfil?: any } | Partial<CandidateData>) =>
      updateOnboardingCase(caseId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['onboardingCase', caseId], updated);
      queryClient.invalidateQueries({ queryKey: ['onboardingCases'] });
    }
  });
};

export const useUploadOnboarding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (param: File | { file: File; documentType?: string }) => {
      if (param instanceof File) {
        return uploadOnboardingFile(param);
      }
      return uploadOnboardingFile(param.file, param.documentType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboardingCases'] });
    }
  });
};

export const useApproveOnboarding = (caseId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => approveOnboardingCase(caseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboardingCase', caseId] });
      queryClient.invalidateQueries({ queryKey: ['onboardingCases'] });
    }
  });
};

export const useRejectOnboarding = (caseId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reason: string) => rejectOnboardingCase(caseId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboardingCase', caseId] });
      queryClient.invalidateQueries({ queryKey: ['onboardingCases'] });
    }
  });
};

/**
 * Hook para validação em tempo real com debounce (~600ms)
 * e cancelamento/descarte de respostas antigas via AbortController e sequence counter.
 */
export const useValidateCadastro = (debounceMs = 600) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidateCadastroResponse | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<any>(null);
  const requestSeqRef = useRef<number>(0);

  const validate = useCallback(
    (cadastro: Partial<CandidateData>) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      setIsValidating(true);

      debounceTimerRef.current = setTimeout(async () => {
        // Cancela requisição anterior se ainda estiver em voo
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;
        const currentSeq = ++requestSeqRef.current;

        try {
          const res = await validateOnboardingCadastro(cadastro, controller.signal);
          // Só aplica se ainda for a última requisição disparada
          if (currentSeq === requestSeqRef.current) {
            setValidationResult(res);
            setIsValidating(false);
          }
        } catch (err: any) {
          if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
            // Ignora cancelamentos intencionais
            return;
          }
          if (currentSeq === requestSeqRef.current) {
            setIsValidating(false);
          }
        }
      }, debounceMs);
    },
    [debounceMs]
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return {
    validate,
    isValidating,
    validationResult,
    setValidationResult
  };
};
