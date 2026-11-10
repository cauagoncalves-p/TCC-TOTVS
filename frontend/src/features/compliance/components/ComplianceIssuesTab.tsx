import React, { useState } from 'react';
import {
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  X,
  AlertCircle,
  Play,
  ShieldAlert
} from 'lucide-react';
import { ComplianceIssue, ComplianceRun } from '../../../types/api';
import { PriorityBadge } from '../../../components/ui/PriorityBadge';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { SourceBadge } from '../../../components/ui/SourceBadge';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatDate } from '../../../lib/formatters';

interface ComplianceIssuesTabProps {
  issues: ComplianceIssue[];
  latestRun?: ComplianceRun | null;
  isLoading: boolean;
  isRh: boolean;
  onExecuteRun: () => void;
  isExecutingRun: boolean;
  onUpdateStatus: (id: number, status: 'corrigida' | 'ignorada', resolutionNote?: string) => void;
  isUpdating: boolean;
}

export const ComplianceIssuesTab: React.FC<ComplianceIssuesTabProps> = ({
  issues,
  latestRun,
  isLoading,
  isRh,
  onExecuteRun,
  isExecutingRun,
  onUpdateStatus,
  isUpdating
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('aberta');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const [selectedIssue, setSelectedIssue] = useState<ComplianceIssue | null>(null);
  const [ignoreNote, setIgnoreNote] = useState<string>('');
  const [ignoreError, setIgnoreError] = useState<string>('');

  // Lista única de departamentos
  const departments = Array.from(
    new Set(issues.map((i) => i.EmployeeDepartment).filter(Boolean))
  ) as string[];

  // Filtragem
  const filtered = issues.filter((item) => {
    if (statusFilter && item.Status !== statusFilter) return false;
    if (priorityFilter && item.Priority !== priorityFilter) return false;
    if (deptFilter && item.EmployeeDepartment !== deptFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = item.EmployeeName?.toLowerCase().includes(q);
      const matchCode = item.RuleCode.toLowerCase().includes(q);
      const matchTitle = item.RuleTitle.toLowerCase().includes(q);
      const matchReg = item.EmployeeRegistration?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchTitle && !matchReg) return false;
    }
    return true;
  });

  const handleOpenDetail = (issue: ComplianceIssue) => {
    setSelectedIssue(issue);
    setIgnoreNote('');
    setIgnoreError('');
  };

  const handleConfirmIgnore = () => {
    if (!ignoreNote.trim()) {
      setIgnoreError('A justificativa é obrigatória para desconsiderar a inconsistência.');
      return;
    }
    if (!selectedIssue) return;
    onUpdateStatus(selectedIssue.Id, 'ignorada', ignoreNote.trim());
    setSelectedIssue(null);
  };

  const handleConfirmFixed = () => {
    if (!selectedIssue) return;
    onUpdateStatus(selectedIssue.Id, 'corrigida');
    setSelectedIssue(null);
  };

  return (
    <div className="space-y-4">
      {/* Seção 1: Validação de Cadastros & Resumo da Execução */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-600" />
              Validação Preventiva de Cadastros (CLT e Integridade)
            </h3>
            <p className="text-xs text-slate-500">
              Analisa colaboradores, contratos, folha de pagamento e regras trabalhistas vigentes.
            </p>
          </div>

          {isRh && (
            <Button
              variant="primary"
              size="sm"
              onClick={onExecuteRun}
              disabled={isExecutingRun}
              className="text-xs gap-1.5"
            >
              <Play className={`w-3.5 h-3.5 ${isExecutingRun ? 'animate-spin' : ''}`} />
              {isExecutingRun ? 'Auditando base cadastral...' : 'Executar auditoria'}
            </Button>
          )}
        </div>

        {/* Resumo da Execução */}
        {latestRun && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3 rounded-lg text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Registros Analisados
              </span>
              <span className="text-slate-800 font-bold text-sm">
                {latestRun.RecordsAnalyzed || 0}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Novas Inconsistências
              </span>
              <span className="text-rose-600 font-bold text-sm">
                +{latestRun.IssuesNew || 0}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Total Abertas
              </span>
              <span className="text-slate-800 font-bold text-sm">
                {latestRun.IssuesOpen || 0}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Última Execução
              </span>
              <span className="text-slate-600 font-medium">
                {formatDate(latestRun.StartedAt)} {new Date(latestRun.StartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Seção 2: Central de Inconsistências (Tabela com filtros) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 border border-slate-200 rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 text-xs text-slate-500 font-medium mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos os status</option>
            <option value="aberta">Abertas</option>
            <option value="corrigida">Corrigidas</option>
            <option value="ignorada">Ignoradas</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todas as prioridades</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos os departamentos</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Busca por colaborador / regra */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Buscar regra ou colaborador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tabela de Inconsistências (Achados) */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhuma inconsistência encontrada"
          description="Nenhum apontamento com os filtros selecionados ou após a auditoria."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium">
                <tr>
                  <th className="py-3 px-3.5">Regra</th>
                  <th className="py-3 px-3.5">Descrição</th>
                  <th className="py-3 px-3.5">Colaborador / Alvo</th>
                  <th className="py-3 px-3.5">Severidade</th>
                  <th className="py-3 px-3.5">Fonte</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr
                    key={item.Id}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    onClick={() => handleOpenDetail(item)}
                  >
                    <td className="py-3 px-3.5 font-mono text-[11px] font-semibold text-slate-800">
                      {item.RuleCode}
                    </td>
                    <td className="py-3 px-3.5 max-w-xs truncate text-slate-700" title={item.Description}>
                      {item.Description}
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-medium text-slate-900">
                        {item.EmployeeName || `Registro #${item.EntityId}`}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.EmployeeDepartment || item.EntityType}
                      </div>
                    </td>
                    <td className="py-3 px-3.5">
                      <PriorityBadge priority={item.Priority} />
                    </td>
                    <td className="py-3 px-3.5">
                      <SourceBadge
                        sourceType={item.SourceType}
                        sourceVerified={item.SourceVerified}
                      />
                    </td>
                    <td className="py-3 px-3.5">
                      <StatusBadge status={item.Status} />
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(item);
                        }}
                        className="text-[11px] h-7 px-2"
                      >
                        Ver Detalhes
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Painel Lateral / Modal com Descrição do Caso, Regra, Fonte, Orientação e Ações */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header Modal */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedIssue.RuleCode} - {selectedIssue.RuleTitle}
                </h3>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo Modal */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Badges de classificação e fonte oficial */}
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={selectedIssue.Priority} />
                <StatusBadge status={selectedIssue.Status} />
                <SourceBadge
                  sourceType={selectedIssue.SourceType}
                  sourceVerified={selectedIssue.SourceVerified}
                />
              </div>

              {/* Colaborador / Entidade envolvida */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="text-[10px] uppercase font-semibold text-slate-400">
                  Colaborador / Alvo
                </div>
                <div className="font-semibold text-slate-800 text-sm">
                  {selectedIssue.EmployeeName || `Entidade ${selectedIssue.EntityType} #${selectedIssue.EntityId}`}
                </div>
                {selectedIssue.EmployeeDepartment && (
                  <div className="text-slate-500">
                    Departamento: {selectedIssue.EmployeeDepartment} · Matrícula:{' '}
                    {selectedIssue.EmployeeRegistration || '-'}
                  </div>
                )}
                <div className="text-slate-400 text-[10px]">
                  Detectado em: {formatDate(selectedIssue.DetectedAt)}
                </div>
              </div>

              {/* Descrição do caso */}
              <div>
                <span className="font-semibold text-slate-700 block mb-1">
                  Descrição da inconformidade:
                </span>
                <p className="text-slate-600 bg-rose-50/50 border border-rose-100 p-2.5 rounded-lg leading-relaxed">
                  {selectedIssue.Description}
                </p>
              </div>

              {/* Regra, Orientação de correção e Fonte */}
              <div>
                <span className="font-semibold text-slate-700 block mb-1">
                  Orientação para correção:
                </span>
                <p className="text-slate-600 bg-blue-50/50 border border-blue-100 p-2.5 rounded-lg leading-relaxed">
                  {selectedIssue.Guidance || 'Ajuste os dados cadastrais ou holerite correspondente.'}
                </p>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  <strong>Referência normativa:</strong> {selectedIssue.SourceReference}
                </span>
              </div>

              {/* Se já foi tratada */}
              {selectedIssue.ResolutionNote && (
                <div className="p-3 bg-slate-100 rounded-lg text-slate-600">
                  <span className="font-semibold block mb-0.5">Nota de Resolução:</span>
                  <p>{selectedIssue.ResolutionNote}</p>
                </div>
              )}

              {/* Ações: Marcar como corrigida e Ignorar (apenas RH; gestor vê apenas modo leitura) */}
              {isRh && selectedIssue.Status === 'aberta' && (
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleConfirmFixed}
                      disabled={isUpdating}
                      className="flex-1 text-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Marcar como corrigida
                    </Button>
                  </div>

                  {/* Ignorar com justificativa obrigatória */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <label className="font-semibold text-slate-700 block">
                      Ou desconsiderar apontamento (justificativa obrigatória):
                    </label>
                    <textarea
                      rows={2}
                      value={ignoreNote}
                      onChange={(e) => {
                        setIgnoreNote(e.target.value);
                        if (ignoreError) setIgnoreError('');
                      }}
                      placeholder="Descreva a fundamentação legal ou operacional para ignorar..."
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    {ignoreError && (
                      <p className="text-[11px] text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {ignoreError}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleConfirmIgnore}
                      disabled={isUpdating}
                      className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50 w-full"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Ignorar com justificativa
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIssue(null)}
                className="text-xs"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
