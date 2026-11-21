// frontend/src/features/retention/components/EmployeesRetentionTable.tsx
import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  User,
  ArrowRight
} from 'lucide-react';
import { RetentionEmployee } from '../types';
import { AttentionBadge } from './AttentionBadge';
import { SignalsTags } from './SignalsTags';
import { Skeleton } from '../../../components/ui/Skeleton';
import { cn } from '../../../lib/utils';

interface EmployeesRetentionTableProps {
  employees: RetentionEmployee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onSelectEmployee?: (id: number, triggerEl?: HTMLElement) => void;
  isLoading?: boolean;
}

export const EmployeesRetentionTable: React.FC<EmployeesRetentionTableProps> = ({
  employees,
  total,
  page,
  limit,
  totalPages,
  onPageChange,
  onSelectEmployee,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!employees || employees.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <User className="w-10 h-10 text-slate-300 mx-auto mb-3" aria-hidden="true" />
        <h4 className="text-sm font-semibold text-slate-800">Nenhum colaborador encontrado</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Tente ajustar os filtros de departamento, nível ou o termo de busca.
        </p>
      </div>
    );
  }

  const renderTrendIcon = (trend: RetentionEmployee['trend']) => {
    switch (trend) {
      case 'subindo':
        return (
          <span title="Sinais em alta" className="inline-flex ml-1">
            <TrendingUp className="w-3.5 h-3.5 text-rose-600" aria-label="Sinais em alta" />
          </span>
        );
      case 'caindo':
        return (
          <span title="Sinais em queda" className="inline-flex ml-1">
            <TrendingDown className="w-3.5 h-3.5 text-emerald-600" aria-label="Sinais em queda" />
          </span>
        );
      case 'estavel':
      default:
        return (
          <span title="Sinais estáveis" className="inline-flex ml-1">
            <Minus className="w-3.5 h-3.5 text-slate-400" aria-label="Sinais estáveis" />
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* ─── Visão Desktop: Tabela estruturada (≥ 768 px) ─── */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="table-scroll">
          <table className="w-full text-left border-collapse text-xs" aria-label="Acompanhamento individual de colaboradores">
            <caption className="sr-only">Tabela de índice de atenção dos colaboradores para apoio à retenção</caption>
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                <th scope="col" className="py-3 px-3.5">Colaborador</th>
                <th scope="col" className="py-3 px-3">Departamento / Cargo</th>
                <th scope="col" className="py-3 px-3">Tempo Casa</th>
                <th scope="col" className="py-3 px-3">Faltas (1m | 3m)</th>
                <th scope="col" className="py-3 px-3">H. Extras (méd.)</th>
                <th scope="col" className="py-3 px-3">Últ. Movimentação</th>
                <th scope="col" className="py-3 px-3">Férias</th>
                <th scope="col" className="py-3 px-3.5 min-w-[150px]">Índice de Atenção</th>
                <th scope="col" className="py-3 px-3.5">Sinais Principais</th>
                <th scope="col" className="py-3 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map(emp => {
                const hasScore = emp.score !== null;
                const scoreColor =
                  emp.score && emp.score >= 65
                    ? 'bg-rose-500'
                    : emp.score && emp.score >= 35
                    ? 'bg-amber-500'
                    : 'bg-emerald-500';

                return (
                  <tr
                    key={emp.id}
                    onClick={(e) => onSelectEmployee?.(emp.id, e.currentTarget)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectEmployee?.(emp.id, e.currentTarget);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Ver detalhes de ${emp.fullName}`}
                    className="hover:bg-brand-50/30 transition-colors cursor-pointer focus:outline-none focus:bg-brand-50/50"
                  >
                    {/* Nome + Matrícula */}
                    <td className="py-3 px-3.5">
                      <span className="font-semibold text-slate-900 block leading-tight">{emp.fullName}</span>
                      <span className="text-[11px] font-mono text-slate-400 block mt-0.5">{emp.registration}</span>
                    </td>

                    {/* Departamento / Cargo */}
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-800 block">{emp.department}</span>
                      <span className="text-[11px] text-slate-500 block">{emp.jobTitle}</span>
                    </td>

                    {/* Tempo de Casa */}
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {emp.tenureMonths >= 12
                        ? `${Math.floor(emp.tenureMonths / 12)}a ${emp.tenureMonths % 12}m`
                        : `${emp.tenureMonths} meses`}
                    </td>

                    {/* Faltas (1m | 3m) */}
                    <td className="py-3 px-3 text-slate-800 whitespace-nowrap">
                      <span className="font-semibold">{emp.lastMonthAbsences.toFixed(1)}d</span>
                      <span className="text-slate-400 mx-1">|</span>
                      <span className="text-slate-600">{emp.recentAbsences.toFixed(1)}d</span>
                    </td>

                    {/* Horas Extras */}
                    <td className="py-3 px-3 text-slate-800 whitespace-nowrap font-medium">
                      {emp.avgRecentOvertime.toFixed(1)} h/mês
                    </td>

                    {/* Última Movimentação */}
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {emp.monthsSinceLastMovement > 0
                        ? `há ${emp.monthsSinceLastMovement} meses`
                        : 'recente'}
                    </td>

                    {/* Férias */}
                    <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                      {emp.vacationBalanceDays} dias
                    </td>

                    {/* Índice de Atenção */}
                    <td className="py-3 px-3.5">
                      {hasScore ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900 flex items-center">
                              {emp.score}/100
                              {renderTrendIcon(emp.trend)}
                            </span>
                            <AttentionBadge level={emp.level} />
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all duration-300', scoreColor)}
                              style={{ width: `${emp.score}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <AttentionBadge level={emp.level} />
                      )}
                    </td>

                    {/* Sinais */}
                    <td className="py-3 px-3.5">
                      <SignalsTags signals={emp.signals} />
                    </td>

                    {/* Ação: Ver Detalhes */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEmployee?.(emp.id, e.currentTarget);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors border border-brand-200/60"
                      >
                        <span>Ver detalhes</span>
                        <ArrowRight className="w-3 h-3" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Visão Mobile: Cartões responsivos (< 768 px conforme PARTE5F) ─── */}
      <div className="block md:hidden space-y-3" role="feed" aria-label="Lista de colaboradores">
        {employees.map(emp => {
          const hasScore = emp.score !== null;
          const scoreColor =
            emp.score && emp.score >= 65
              ? 'bg-rose-500'
              : emp.score && emp.score >= 35
              ? 'bg-amber-500'
              : 'bg-emerald-500';

          return (
            <div
              key={emp.id}
              onClick={(e) => onSelectEmployee?.(emp.id, e.currentTarget)}
              className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">{emp.fullName}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span className="font-mono text-slate-400">{emp.registration}</span>
                    <span>•</span>
                    <span className="font-medium text-slate-700">{emp.department}</span>
                  </div>
                </div>

                <AttentionBadge level={emp.level} />
              </div>

              {/* Barra do índice em mobile */}
              {hasScore && (
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Pontuação do Índice</span>
                    <span className="font-bold text-slate-900 flex items-center">
                      {emp.score}/100
                      {renderTrendIcon(emp.trend)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', scoreColor)}
                      style={{ width: `${emp.score}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Grade de métricas individuais */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-[10px] text-slate-400 block uppercase">Faltas (1m | 3m)</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {emp.lastMonthAbsences.toFixed(1)}d | {emp.recentAbsences.toFixed(1)}d
                  </span>
                </div>

                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-[10px] text-slate-400 block uppercase">Horas Extras (méd.)</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {emp.avgRecentOvertime.toFixed(1)} h/mês
                  </span>
                </div>

                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-[10px] text-slate-400 block uppercase">Tempo de Casa</span>
                  <span className="font-medium text-slate-700 mt-0.5 block">
                    {emp.tenureMonths >= 12
                      ? `${Math.floor(emp.tenureMonths / 12)}a ${emp.tenureMonths % 12}m`
                      : `${emp.tenureMonths} meses`}
                  </span>
                </div>

                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-[10px] text-slate-400 block uppercase">Últ. Movimentação</span>
                  <span className="font-medium text-slate-700 mt-0.5 block">
                    {emp.monthsSinceLastMovement > 0 ? `há ${emp.monthsSinceLastMovement}m` : 'recente'}
                  </span>
                </div>
              </div>

              {/* Sinais em mobile */}
              {emp.signals && emp.signals.length > 0 && (
                <div className="pt-1 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                    Sinais Identificados
                  </span>
                  <SignalsTags signals={emp.signals} />
                </div>
              )}

              {/* Botão Ver Detalhes em Mobile */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEmployee?.(emp.id, e.currentTarget);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors border border-brand-200/60"
                >
                  <span>Ver detalhes completos</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Paginação acessível ─── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-600">
        <div>
          Exibindo <strong>{employees.length}</strong> de <strong>{total}</strong> colaboradores
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5" role="navigation" aria-label="Paginação da lista de colaboradores">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Página anterior"
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 font-medium">
              Página {page} de {totalPages}
            </span>

            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="Próxima página"
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
