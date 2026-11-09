import React, { useState } from 'react';
import { Sparkles, Plus, Users, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { StatCard } from '../../components/ui/StatCard';
import { OnboardingCaseTable } from '../../features/onboarding/components/OnboardingCaseTable';
import { OnboardingUploadModal } from '../../features/onboarding/components/OnboardingUploadModal';
import { useOnboardingCases } from '../../features/onboarding/hooks';

export const OnboardingPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<string>('todos');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useOnboardingCases(activeFilter);
  const cases = data?.cases || [];

  // Contadores rápidos para métricas
  const totalCount = cases.length;
  const pendingCount = cases.filter((c) => c.Status === 'pendente_revisao').length;
  const approvedCount = cases.filter((c) => c.Status === 'aprovado').length;
  const rejectedCount = cases.filter((c) => c.Status === 'rejeitado').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Onboarding com IA"
        subtitle="Processamento automático de fichas admissionais em PDF com validação cadastral e geração de acessos"
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            className="gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Admitir Novo Colaborador</span>
          </Button>
        }
      />

      {/* Mini Cards de Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Total de Casos</span>
            <span className="text-xl font-bold text-slate-900 mt-0.5 block">{totalCount}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-100 text-slate-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Pendentes de Revisão</span>
            <span className="text-xl font-bold text-amber-600 mt-0.5 block">{pendingCount}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Aprovados</span>
            <span className="text-xl font-bold text-emerald-600 mt-0.5 block">{approvedCount}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Rejeitados</span>
            <span className="text-xl font-bold text-rose-600 mt-0.5 block">{rejectedCount}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabela de Casos ou Erro */}
      {isError ? (
        <ErrorState
          title="Erro ao carregar casos de admissão"
          message={error?.message || 'Não foi possível consultar os processos de onboarding.'}
          onRetry={() => refetch()}
        />
      ) : (
        <OnboardingCaseTable
          cases={cases}
          isLoading={isLoading}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onNewCaseClick={() => setIsUploadModalOpen(true)}
        />
      )}

      {/* Modal de Upload de PDF */}
      <OnboardingUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
};

export default OnboardingPage;
