// frontend/src/pages/onboarding/OnboardingListPage.tsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  PenTool,
  Search,
  Filter,
  FileText,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Users
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate } from '../../lib/formatters';
import { useOnboardingCases } from '../../features/onboarding/hooks';
import { OnboardingUploadModal } from '../../features/onboarding/components/OnboardingUploadModal';

export const OnboardingListPage: React.FC = () => {
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [originFilter, setOriginFilter] = useState<string>('todas');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useOnboardingCases(
    statusFilter !== 'todos' ? statusFilter : undefined
  );

  const rawCases = data?.cases || [];

  // Filtro de origem e busca textual no cliente
  const filteredCases = useMemo(() => {
    return rawCases.filter((c) => {
      // Filtro de origem
      if (originFilter !== 'todas') {
        const itemOrigin = c.Origin || (c.SourceFileName ? 'pdf' : 'manual');
        if (itemOrigin !== originFilter) return false;
      }

      // Busca por ID, nome de arquivo ou responsável
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchId = String(c.Id).includes(term);
        const matchFile = (c.SourceFileName || '').toLowerCase().includes(term);
        const matchCreator = (c.CreatedByName || '').toLowerCase().includes(term);
        const matchReviewer = (c.ReviewedByName || '').toLowerCase().includes(term);
        if (!matchId && !matchFile && !matchCreator && !matchReviewer) return false;
      }

      return true;
    });
  }, [rawCases, originFilter, searchTerm]);

  // Contadores
  const totalCount = rawCases.length;
  const pendingCount = rawCases.filter((c) => c.Status === 'pendente_revisao').length;
  const approvedCount = rawCases.filter((c) => c.Status === 'aprovado').length;
  const rejectedCount = rawCases.filter((c) => c.Status === 'rejeitado').length;

  return (
    <div className="space-y-6">
      {/* PageHeader com os 2 botões principais lado a lado */}
      <PageHeader
        title="Onboarding e Admissão"
        subtitle="Entrada de novos colaboradores por leitura de documentos com IA ou preenchimento manual com validação centralizada"
        action={
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              className="gap-2 shadow-2xs text-xs font-semibold"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Enviar documento (IA)</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => navigate('/onboarding/novo/manual')}
              className="gap-2 shadow-2xs text-xs font-semibold"
            >
              <PenTool className="w-4 h-4" />
              <span>Preencher manualmente</span>
            </Button>
          </div>
        }
      />

      {/* Mini Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Total de Casos</span>
            <span className="text-xl font-bold text-slate-900 mt-0.5 block">{totalCount}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-100 text-slate-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Pendentes de Revisão</span>
            <span className="text-xl font-bold text-amber-600 mt-0.5 block">{pendingCount}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Aprovados</span>
            <span className="text-xl font-bold text-emerald-600 mt-0.5 block">{approvedCount}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block">Rejeitados</span>
            <span className="text-xl font-bold text-rose-600 mt-0.5 block">{rejectedCount}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Abas de Status */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'pendente_revisao', label: 'Pendentes' },
              { id: 'aprovado', label: 'Aprovados' },
              { id: 'rejeitado', label: 'Rejeitados' }
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Origem e Busca */}
          <div className="flex items-center gap-2.5 flex-1 md:justify-end">
            {/* Seletor de Origem */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="todas">Origem: Todas</option>
                <option value="pdf">Origem: PDF (IA)</option>
                <option value="manual">Origem: Manual</option>
              </select>
            </div>

            {/* Input de Busca */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por ID, documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Casos */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : isError ? (
          <ErrorState
            title="Erro ao carregar casos de admissão"
            message={error?.message || 'Não foi possível consultar os processos de onboarding.'}
            onRetry={() => refetch()}
          />
        ) : filteredCases.length === 0 ? (
          <div className="py-12">
            <EmptyState
              title="Nenhum processo de admissão localizado"
              description={
                statusFilter !== 'todos' || originFilter !== 'todas' || searchTerm.trim()
                  ? 'Nenhum caso coincide com os filtros selecionados.'
                  : 'Nenhum caso foi iniciado ainda. Envie um documento PDF para leitura com IA ou inicie o preenchimento manual.'
              }
              action={
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsUploadModalOpen(true)}
                    className="gap-1.5 text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Enviar documento (IA)</span>
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => navigate('/onboarding/novo/manual')}
                    className="gap-1.5 text-xs"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Preencher manualmente</span>
                  </Button>
                </div>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Documento / Origem</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Data do Registro</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCases.map((c) => {
                  const isPending = c.Status === 'pendente_revisao';
                  const isManual = c.Origin === 'manual' || !c.SourceFileName;

                  return (
                    <tr
                      key={c.Id}
                      onClick={() => navigate(`/onboarding/${c.Id}`)}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-500 text-xs">
                        #{c.Id}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          {isManual ? (
                            <PenTool className="w-4 h-4 text-purple-600 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          )}
                          <span className="truncate max-w-xs">
                            {isManual ? 'Preenchimento Manual' : c.SourceFileName || 'Documento PDF'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${
                            isManual
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {isManual ? (
                            <>
                              <PenTool className="w-2.5 h-2.5" />
                              <span>Manual</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>PDF (IA)</span>
                            </>
                          )}
                        </span>
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
                          type="button"
                          variant={isPending ? 'primary' : 'outline'}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/onboarding/${c.Id}`);
                          }}
                          className="text-xs h-8 gap-1"
                        >
                          <span>{isPending ? 'Revisar' : 'Abrir'}</span>
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

      {/* Modal de Upload de PDF para Enviar documento (IA) */}
      <OnboardingUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={(createdCaseId) => navigate(`/onboarding/${createdCaseId}`)}
      />
    </div>
  );
};

export default OnboardingListPage;
