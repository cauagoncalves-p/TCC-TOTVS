// frontend/src/features/retention/components/EmployeeDetailPanel.tsx
import React, { useEffect, useRef } from 'react';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  Building2,
  Calendar,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Umbrella
} from 'lucide-react';
import { useRetentionDetail } from '../hooks';
import { AttentionBadge } from './AttentionBadge';
import { SignalsTags } from './SignalsTags';
import { ScoreBreakdown } from './ScoreBreakdown';
import { MonthlyComparisonChart } from './MonthlyComparisonChart';
import { CareerTimeline } from './CareerTimeline';
import { NotConsideredBox } from './NotConsideredBox';
import { FollowUpForm } from './FollowUpForm';
import { FollowUpList } from './FollowUpList';
import { DATA_QUALITY_LABELS, TREND_LABELS } from '../labels';
import { ErrorState } from '../../../components/ui/ErrorState';
import { cn } from '../../../lib/utils';

interface EmployeeDetailPanelProps {
  employeeId: number | null;
  onClose: () => void;
  triggerElement?: HTMLElement | null;
}

export const EmployeeDetailPanel: React.FC<EmployeeDetailPanelProps> = ({
  employeeId,
  onClose,
  triggerElement
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const {
    data: emp,
    isLoading,
    isError,
    error,
    refetch
  } = useRetentionDetail(employeeId);

  // Fecha ao pressionar Escape e mantém o foco no painel
  useEffect(() => {
    if (!employeeId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Foca no botão fechar ao abrir
    setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // Devolve o foco ao botão/elemento de origem ao fechar
      if (triggerElement && triggerElement.focus) {
        triggerElement.focus();
      }
    };
  }, [employeeId, onClose, triggerElement]);

  if (!employeeId) return null;

  const scoreColor =
    emp?.score && emp.score >= 65
      ? 'text-rose-600 bg-rose-50 border-rose-200'
      : emp?.score && emp.score >= 35
      ? 'text-amber-600 bg-amber-50 border-amber-200'
      : 'text-emerald-600 bg-emerald-50 border-emerald-200';

  const isNotFound = (error as any)?.response?.status === 404;
  const isForbidden = (error as any)?.response?.status === 403;
  const isRateLimited = (error as any)?.response?.status === 429;

  return (
    <div
      className="fixed inset-0 z-[var(--z-drawer)] flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-panel-title"
    >
      {/* Backdrop clicável */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Conteúdo do Painel Lateral Deslizante (Tela cheia em mobile < 768px, largura máx 680px em desktop) */}
      <div
        ref={panelRef}
        className="relative w-full md:max-w-2xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col z-10 animate-in slide-in-from-right duration-200 overflow-hidden"
      >
        {/* Cabeçalho Fixo do Painel */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-100 text-brand-800 uppercase tracking-wider">
                Acompanhamento Individual
              </span>
              <span className="text-[11px] text-amber-700 flex items-center gap-1 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                <ShieldAlert className="w-3 h-3 text-amber-600" aria-hidden="true" />
                Este acesso é registrado
              </span>
            </div>

            <h3 id="detail-panel-title" className="text-lg font-bold text-slate-900 leading-snug">
              {emp?.fullName || 'Detalhes do Colaborador'}
            </h3>

            {emp && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                <span className="font-mono text-slate-600 font-semibold">{emp.registration}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-700">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  {emp.department}
                </span>
                <span>•</span>
                <span className="font-medium text-slate-800">{emp.jobTitle}</span>
              </div>
            )}
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar painel de detalhes"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Rolagem */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {isLoading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-28 bg-slate-100 rounded-xl" />
              <div className="h-44 bg-slate-100 rounded-xl" />
              <div className="h-64 bg-slate-100 rounded-xl" />
            </div>
          )}

          {isError && (
            <div className="py-6">
              {isForbidden ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
                  Acesso restrito ao RH. Você não possui autorização para visualizar este colaborador.
                </div>
              ) : isNotFound ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-sm text-center">
                  Colaborador não encontrado ou inativo.
                </div>
              ) : isRateLimited ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                  {(error as any)?.response?.data?.message || 'Muitas requisições. Por favor, aguarde alguns instantes.'}
                </div>
              ) : (
                <ErrorState
                  title="Erro ao carregar detalhes"
                  message="Não foi possível obter o histórico e análise deste colaborador."
                  onRetry={() => refetch()}
                />
              )}
            </div>
          )}

          {emp && (
            <>
              {/* Bloco 1: Índice e Nível com Frase Fixa de Cuidado */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {emp.score !== null ? (
                      <div className={cn('px-4 py-2.5 rounded-xl border text-center font-mono', scoreColor)}>
                        <span className="text-2xl font-black block leading-none">{emp.score}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider block mt-0.5 opacity-80">
                          de 100 pts
                        </span>
                      </div>
                    ) : (
                      <div className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-xs font-semibold">
                        Sem pontuação numérica
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <AttentionBadge level={emp.level} className="text-xs px-2.5 py-1" />
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          Tendência:{' '}
                          <strong className="text-slate-800">
                            {TREND_LABELS[emp.trend] || emp.trend}
                          </strong>
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-1">
                        Qualidade dos dados: <strong>{DATA_QUALITY_LABELS[emp.dataQuality]}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Sinais em destaque */}
                  {emp.signals && emp.signals.length > 0 && (
                    <div className="sm:text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                        Sinais Observados
                      </span>
                      <SignalsTags signals={emp.signals} />
                    </div>
                  )}
                </div>

                {/* Frase Fixa Responsável Obrigatória */}
                <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-600 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-600 shrink-0" aria-hidden="true" />
                  <span>
                    <strong>Indicador de apoio.</strong> Não é uma previsão de saída, não avalia desempenho individual e não deve ser usado para fins disciplinares.
                  </span>
                </div>
              </div>

              {/* Informações Funcionais Básicas (Tempo de Casa & Saldo de Férias) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                    Tempo de Casa
                  </span>
                  <span className="text-sm font-bold text-slate-900 block">
                    {emp.tenureMonths >= 12
                      ? `${Math.floor(emp.tenureMonths / 12)} anos e ${emp.tenureMonths % 12} meses`
                      : `${emp.tenureMonths} meses`}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Contrato: {emp.contractType || 'CLT'}
                  </span>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                    <Umbrella className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                    Saldo de Férias
                  </span>
                  <span className="text-sm font-bold text-slate-900 block">
                    {emp.vacationBalanceDays} dias acumulados
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {emp.vacationBalanceDays >= 30 ? 'Atenção para período concessivo' : 'Saldo regular'}
                  </span>
                </div>
              </div>

              {/* Bloco 2: Composição do Índice (3 Barras com Frases Explicativas da API) */}
              <ScoreBreakdown components={emp.components} />

              {/* Bloco 3: Gráfico de 12 Meses vs Mediana do Departamento + Resumo Textual */}
              <MonthlyComparisonChart
                series={emp.series12Months || []}
                a11ySummary={emp.a11ySummary}
              />

              {/* Bloco 4: Trajetória de Carreira (SEM SALÁRIOS) */}
              <CareerTimeline careerHistory={emp.careerHistory || []} />

              {/* Bloco 5: O que NÃO é considerado (Transparência Ética) */}
              <NotConsideredBox />

              {/* Bloco 6: Acompanhamento de RH (Fase C) */}
              <div className="pt-4 border-t border-slate-200 space-y-5">
                <FollowUpForm
                  employeeId={emp.id}
                  onSuccess={() => refetch()}
                />

                <FollowUpList followUps={emp.followUps || []} />
              </div>
            </>
          )}
        </div>

        {/* Rodapé do Painel */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 text-center text-xs text-slate-400 shrink-0">
          TOTVS RH • Inteligência Preditiva • Acompanhamento Ético de Colaboradores
        </div>
      </div>
    </div>
  );
};
