import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { Button } from '../../components/ui/Button';
import { OnboardingReviewForm } from '../../features/onboarding/components/OnboardingReviewForm';
import { useOnboardingCase } from '../../features/onboarding/hooks';

export const OnboardingReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const caseId = Number(id);

  const { data: caseData, isLoading, isError, error, refetch } = useOnboardingCase(caseId);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
          <Skeleton className="w-24 h-8" />
          <Skeleton className="w-40 h-8" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !caseData) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="pb-4 border-b border-slate-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/onboarding')}
            className="text-xs text-slate-600 gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para lista de admissões</span>
          </Button>
        </div>
        <ErrorState
          title="Processo de admissão não encontrado"
          message={error?.message || 'O caso solicitado pode não existir ou ter sido removido.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <OnboardingReviewForm caseData={caseData} onRefresh={() => refetch()} />
    </div>
  );
};

export default OnboardingReviewPage;
