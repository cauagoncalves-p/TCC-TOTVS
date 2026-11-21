// frontend/src/features/retention/components/RetentionEmployeesTab.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Building2,
  ArrowUpDown,
  RefreshCw,
  Sparkles,
  Info,
  Calculator,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  useRetentionEmployees,
  useRetentionSummary,
  useRetentionConfig,
  useRecalculate
} from '../hooks';
import { AttentionLevel, RetentionFilters } from '../types';
import { RestrictedNotice } from './RestrictedNotice';
import { RetentionSummaryCards } from './RetentionSummaryCards';
import { EmployeesRetentionTable } from './EmployeesRetentionTable';
import { EmployeeDetailPanel } from './EmployeeDetailPanel';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { ErrorState } from '../../../components/ui/ErrorState';
import { cn } from '../../../lib/utils';

export const RetentionEmployeesTab: React.FC = () => {
  const [scope, setScope] = useState<'company' | 'department'>('company');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<AttentionLevel | ''>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [onlySignals, setOnlySignals] = useState<boolean>(false);
  const [sort, setSort] = useState<RetentionFilters['sort']>('score_desc');
  const [page, setPage] = useState<number>(1);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  // Estado para o painel de detalhe do colaborador (mantido estritamente em memória/state, NUNCA na URL)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);

  // Estado para confirmação de recálculo
  const [isRecalculateModalOpen, setIsRecalculateModalOpen] = useState<boolean>(false);
  const [recalculateFeedback, setRecalculateFeedback] = useState<string | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce na busca textual (~400ms, mínimo 2 caracteres por PARTE5G)
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const trimmed = searchTerm.trim();
      setDebouncedSearch(trimmed.length >= 2 ? trimmed : '');
      setPage(1);
    }, 400);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchTerm]);

  // Reseta para a primeira página ao alterar filtros
  useEffect(() => {
    setPage(1);
  }, [scope, departmentId, selectedLevel, onlySignals, sort]);

  const filters: RetentionFilters = {
    scope,
    departmentId: scope === 'department' ? departmentId : undefined,
    level: selectedLevel || undefined,
    q: debouncedSearch || undefined,
    onlySignals,
    sort,
    page,
    limit: 25
  };

  const {
    data: empData,
    isLoading: loadingEmployees,
    isError: errorEmployees,
    refetch: refetchEmployees
  } = useRetentionEmployees(filters);

  const {
    data: summaryData,
    isLoading: loadingSummary,
    refetch: refetchSummary
  } = useRetentionSummary({
    scope,
    departmentId: scope === 'department' ? departmentId : undefined
  });

  const { data: modelConfig } = useRetentionConfig();
  const recalculateMutation = useRecalculate();

  const departments = empData?.departments || [];

  const handleRefresh = () => {
    refetchEmployees();
    refetchSummary();
  };

  const handleConfirmRecalculate = async () => {
    try {
      await recalculateMutation.mutateAsync();
      setIsRecalculateModalOpen(false);
      setRecalculateFeedback('Índices recalculados com sucesso para todos os colaboradores.');
      setTimeout(() => setRecalculateFeedback(null), 5000);
      handleRefresh();
    } catch (err: any) {
      setIsRecalculateModalOpen(false);
      setRecalculateFeedback('Não foi possível recalcular os índices agora. Os dados anteriores foram mantidos.');
      setTimeout(() => setRecalculateFeedback(null), 6000);
    }
  };

  if (errorEmployees) {
    return (
      <div className="space-y-6">
        <RestrictedNotice />
        <ErrorState
          title="Erro ao carregar colaboradores"
          message="Não foi possível obter o cálculo de retenção dos colaboradores. Verifique sua conexão e tente novamente."
          onRetry={handleRefresh}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Aviso Fixo Obrigatório */}
      <RestrictedNotice />

      {/* Notificação Temporária de Recálculo */}
      {recalculateFeedback && (
        <div
          className={cn(
            'flex items-center gap-2 p-3 rounded-xl border text-xs font-medium animate-in fade-in',
            recalculateFeedback.includes('sucesso')
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          )}
          role="status"
        >
          {recalculateFeedback.includes('sucesso') ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{recalculateFeedback}</span>
        </div>
      )}

      {/* Cartões de Resumo (Clicáveis para alternar filtro de nível) */}
      <RetentionSummaryCards
        summary={summaryData}
        selectedLevel={selectedLevel}
        onSelectLevel={setSelectedLevel}
        isLoading={loadingSummary}
      />

      {/* Barra de Filtros e Controles */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3.5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Escopo: Toda a empresa vs Departamento */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
              <button
                type="button"
                onClick={() => {
                  setScope('company');
                  setDepartmentId('');
                }}
                className={cn(
                  'px-3 py-1.5 rounded-md font-medium transition-all',
                  scope === 'company'
                    ? 'bg-white text-brand-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                Toda a empresa
              </button>
              <button
                type="button"
                onClick={() => setScope('department')}
                className={cn(
                  'px-3 py-1.5 rounded-md font-medium transition-all',
                  scope === 'department'
                    ? 'bg-white text-brand-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                )}
              >
                Por departamento
              </button>
            </div>

            {/* Seletor de Departamento */}
            {scope === 'department' && (
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  aria-label="Selecionar departamento"
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Todos departamentos</option>
                  {departments.map((d) => (
                    <option key={d.Id} value={d.Id}>
                      {d.Name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Links e Ações: Como é calculado + Recalcular índice + Atualizar */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/inteligencia/colaboradores/como-calculamos"
              className="text-xs text-brand-700 hover:text-brand-900 font-semibold inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100/70 border border-brand-200/60 transition-colors"
            >
              <Info className="w-3.5 h-3.5 text-brand-600" aria-hidden="true" />
              <span>Como o índice é calculado</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsRecalculateModalOpen(true)}
              className="text-xs text-slate-700 hover:text-slate-900 font-medium inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Calculator className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              <span>Recalcular índice</span>
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="Atualizar dados"
              aria-label="Atualizar lista de colaboradores"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Linha 2: Busca, Filtro de Sinais e Ordenação */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Campo de Busca por Nome ou Matrícula (NUNCA vai para a URL) */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou matrícula (mín. 2 letras)..."
              aria-label="Buscar colaborador por nome ou matrícula"
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Checkbox: Somente com sinais */}
            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlySignals}
                onChange={(e) => setOnlySignals(e.target.checked)}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
              />
              <span className="font-medium">Somente com sinais</span>
            </label>

            {/* Ordenação */}
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as RetentionFilters['sort'])}
                aria-label="Ordenar colaboradores por"
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="score_desc">Índice (maior primeiro)</option>
                <option value="score_asc">Índice (menor primeiro)</option>
                <option value="absences_desc">Faltas (mais faltas)</option>
                <option value="overtime_desc">Horas Extras (mais horas)</option>
                <option value="stagnation_desc">Tempo sem movimentação</option>
                <option value="name_asc">Nome (A - Z)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Colaboradores (ou cartões no celular) */}
      <EmployeesRetentionTable
        employees={empData?.employees || []}
        total={empData?.total || 0}
        page={empData?.page || 1}
        limit={empData?.limit || 25}
        totalPages={empData?.totalPages || 1}
        onPageChange={setPage}
        onSelectEmployee={(id, el) => {
          setSelectedEmployeeId(id);
          if (el) setTriggerElement(el);
        }}
        isLoading={loadingEmployees}
      />

      {/* Painel Lateral de Detalhes do Colaborador (Drawer) */}
      <EmployeeDetailPanel
        employeeId={selectedEmployeeId}
        onClose={() => setSelectedEmployeeId(null)}
        triggerElement={triggerElement}
      />

      {/* Diálogo de Confirmação para Recalcular Índice */}
      <ConfirmDialog
        isOpen={isRecalculateModalOpen}
        title="Recalcular Índice de Atenção?"
        description="O recálculo processará as médias móveis trimestrais, as medianas departamentais e os apontamentos de horas extras e faltas para atualizar a pontuação de todos os colaboradores ativos. Deseja prosseguir?"
        confirmLabel="Sim, Recalcular"
        cancelLabel="Cancelar"
        variant="primary"
        isLoading={recalculateMutation.isPending}
        onConfirm={handleConfirmRecalculate}
        onCancel={() => setIsRecalculateModalOpen(false)}
      />
    </div>
  );
};
