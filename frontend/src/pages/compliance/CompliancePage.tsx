import React, { useState } from 'react';
import {
  LayoutDashboard,
  AlertTriangle,
  Send,
  Calendar,
  History
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { authService } from '../../services/authService';
import {
  useComplianceIssues,
  useComplianceRuns,
  useEsocialEvents,
  useAuditLog,
  useExecuteComplianceRun,
  useUpdateIssueStatus,
  useConfirmEsocialEvent
} from '../../features/compliance/hooks';
import { ComplianceDashboardTab } from '../../features/compliance/components/ComplianceDashboardTab';
import { ComplianceIssuesTab } from '../../features/compliance/components/ComplianceIssuesTab';
import { EsocialAuditTab } from '../../features/compliance/components/EsocialAuditTab';
import { ObligationsCalendarTab } from '../../features/compliance/components/ObligationsCalendarTab';
import { AuditLogTab } from '../../features/compliance/components/AuditLogTab';

type TabKey = 'dashboard' | 'issues' | 'esocial' | 'obligations' | 'audit';

export const CompliancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [auditOffset, setAuditOffset] = useState<number>(0);

  const user = authService.getUser();
  const isRh = user?.role === 'rh';

  // Consultas principais
  const { data: issuesData, isLoading: loadingIssues } = useComplianceIssues();
  const issues = issuesData?.issues || [];

  const { data: runsData, isLoading: loadingRuns } = useComplianceRuns();
  const runs = runsData?.runs || [];
  const latestRun = runs.length > 0 ? runs[0] : null;

  const { data: eventsData, isLoading: loadingEvents } = useEsocialEvents();
  const events = eventsData?.events || [];

  const { data: auditData, isLoading: loadingAudit } = useAuditLog({
    limit: 15,
    offset: auditOffset
  });

  // Mutações
  const executeRunMutation = useExecuteComplianceRun();
  const updateIssueMutation = useUpdateIssueStatus();
  const confirmEventMutation = useConfirmEsocialEvent();

  const handleExecuteCadastros = () => {
    executeRunMutation.mutate({ scope: 'cadastros' });
  };

  const handleExecuteEsocial = () => {
    executeRunMutation.mutate({ scope: 'esocial' });
  };

  const handleUpdateIssue = (
    id: number,
    status: 'corrigida' | 'ignorada',
    resolutionNote?: string
  ) => {
    updateIssueMutation.mutate({ id, status, resolutionNote });
  };

  const handleConfirmEvent = (id: number) => {
    confirmEventMutation.mutate(id);
  };

  const openIssuesCount = issues.filter((i) => i.Status === 'aberta').length;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="TOTVS Compliance Inteligente"
        subtitle="Dashboard de conformidade, auditoria preventiva, obrigações trabalhistas e validação prévia do eSocial (Fases F4a e F4b)."
      />

      {/* Navegação por Abas (Fase F4b) */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-xs transition-colors ${
              activeTab === 'dashboard'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('issues')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-xs transition-colors relative ${
              activeTab === 'issues'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Central de Inconsistências
            {openIssuesCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700">
                {openIssuesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('esocial')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-xs transition-colors ${
              activeTab === 'esocial'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Send className="w-4 h-4" />
            Auditoria eSocial
          </button>

          <button
            onClick={() => setActiveTab('obligations')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-xs transition-colors ${
              activeTab === 'obligations'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Calendário de Obrigações
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-xs transition-colors ${
              activeTab === 'audit'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <History className="w-4 h-4" />
            Histórico e Auditoria
          </button>
        </nav>
      </div>

      {/* Conteúdo das Abas */}
      {activeTab === 'dashboard' && (
        <ComplianceDashboardTab
          issues={issues}
          runs={runs}
          upcomingObligationsCount={2}
          isLoading={loadingIssues || loadingRuns}
          isRh={isRh}
          onExecuteRun={handleExecuteCadastros}
          isExecutingRun={executeRunMutation.isPending}
        />
      )}

      {activeTab === 'issues' && (
        <ComplianceIssuesTab
          issues={issues}
          latestRun={latestRun}
          isLoading={loadingIssues || loadingRuns}
          isRh={isRh}
          onExecuteRun={handleExecuteCadastros}
          isExecutingRun={executeRunMutation.isPending}
          onUpdateStatus={handleUpdateIssue}
          isUpdating={updateIssueMutation.isPending}
        />
      )}

      {activeTab === 'esocial' && (
        <EsocialAuditTab
          events={events}
          issues={issues}
          isLoading={loadingEvents || loadingIssues}
          isRh={isRh}
          onAuditEvents={handleExecuteEsocial}
          isAuditing={executeRunMutation.isPending}
          onConfirmEvent={handleConfirmEvent}
          isConfirming={confirmEventMutation.isPending}
        />
      )}

      {activeTab === 'obligations' && <ObligationsCalendarTab isRh={isRh} />}

      {activeTab === 'audit' && (
        <AuditLogTab
          runs={runs}
          logs={auditData?.logs || []}
          total={auditData?.total || 0}
          limit={auditData?.limit || 15}
          offset={auditOffset}
          isLoading={loadingAudit}
          onPageChange={setAuditOffset}
        />
      )}
    </div>
  );
};
