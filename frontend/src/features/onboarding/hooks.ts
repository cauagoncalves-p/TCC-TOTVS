import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOnboardingCases,
  getOnboardingCaseById,
  uploadOnboardingFile,
  updateOnboardingCase,
  approveOnboardingCase,
  rejectOnboardingCase
} from './api';
import { CandidateData } from '../../types/api';

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

export const useUploadOnboarding = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadOnboardingFile(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboardingCases'] });
    }
  });
};

export const useUpdateOnboarding = (caseId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CandidateData) => updateOnboardingCase(caseId, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['onboardingCase', caseId], updated);
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
