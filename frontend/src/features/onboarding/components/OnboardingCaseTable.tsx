import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, Clock, UserCheck, AlertCircle } from 'lucide-react';
import { OnboardingCaseSummary, OnboardingStatus } from '../../../types/api';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Button } from '../../../components/ui/Button';
import { formatDate } from '../../../lib/formatters';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';

export interface OnboardingCaseTableProps {
  cases: OnboardingCaseSummary[];
  isLoading?: boolean;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onNewCaseClick: () => void;
}

export const OnboardingCaseTable: React.FC<OnboardingCaseTableProps> = ({
  cases,
  isLoading = false,
  activeFilter,
  onFilterChange,
  onNewCaseClick
}) => {
  const navigate = useNavigate();

  const filterTabs = [
    { id: 'todos', label: 'Todos os Casos' },
    { id: 'pendente_revisao', label: 'Pendentes de Revisão' },
    { id: 'aprovado', label: 'Aprovados' },
    { id: 'rejeitado', label: 'Rejeitados' }
  ];

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onFilterChange(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {cases.length} {cases.length === 1 ? 'caso encontrado' : 'casos encontrados'}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : cases.length === 0 ? (
          <div className="py-12">
            <EmptyState
              title="Nenhum processo de admissão localizado"
              description={
                activeFilter !== 'todos'
                  ? 'Não existem casos cadastrados com o filtro de status selecionado.'
                  : 'Nenhuma ficha cadastral foi enviada ainda. Faça o upload do primeiro documento PDF.'
              }
              action={
                <Button variant="primary" size="sm" onClick={onNewCaseClick} className="gap-1.5 text-xs">
                  <span>Enviar Ficha de Admissão</span>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Documento / Ficha</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Data do Envio</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {cases.map((c) => {
                  const isPending = c.Status === 'pendente_revisao';
                  return (
                    <tr
                      key={c.Id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/onboarding/${c.Id}`)}
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-500 text-xs">
                        #{c.Id}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                          <span className="truncate max-w-xs">{c.SourceFileName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={c.Status} />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDate(c.CreatedAt)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {c.CreatedByName || 'Sistema RH'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant={isPending ? 'primary' : 'outline'}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/onboarding/${c.Id}`);
                          }}
                          className="text-xs h-8 gap-1"
                        >
                          <span>{isPending ? 'Revisar' : 'Visualizar'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
