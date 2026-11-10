import React, { useState } from 'react';
import {
  TrendingDown,
  Clock,
  UserX,
  AlertTriangle,
  BrainCircuit,
  BarChart3
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DisclaimerBanner } from '../../components/ui/DisclaimerBanner';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { authService } from '../../services/authService';
import {
  useDepartments,
  useAnalyticsSummary,
  useTimeseries,
  useByDepartment,
  useHotspots,
  useAlerts,
  usePredictions,
  defaultFilters,
  AnalyticsFilters
} from '../../features/analytics/hooks';
import { AnalyticsFilterBar } from '../../features/analytics/components/AnalyticsFilterBar';
import { IndicatorsTimeseriesChart } from '../../features/analytics/components/IndicatorsTimeseriesChart';
import { DepartmentComparisonChart } from '../../features/analytics/components/DepartmentComparisonChart';
import { HotspotRankingChart } from '../../features/analytics/components/HotspotRankingChart';
import { AlertsCenter } from '../../features/analytics/components/AlertsCenter';

export const AnalyticsPage: React.FC = () => {
  const user = authService.getUser();
  const isRh = user?.role === 'rh';

  const [filters, setFilters] = useState<AnalyticsFilters>(defaultFilters());

  // Queries
  const { data: deptData, isLoading: loadingDepts } = useDepartments();
  const departments = deptData?.departments || [];

  const {
    data: summary,
    isLoading: loadingSummary,
    isError: errorSummary,
    refetch: refetchSummary
  } = useAnalyticsSummary(filters);

  const {
    data: tsData,
    isLoading: loadingTs
  } = useTimeseries(filters);

  const {
    data: deptCompData,
    isLoading: loadingDeptComp
  } = useByDepartment();

  const {
    data: hotspotData,
    isLoading: loadingHotspots
  } = useHotspots();

  const {
    data: alertsData,
    isLoading: loadingAlerts
  } = useAlerts({ departmentId: filters.departmentId });

  const {
    data: predictionsData,
    isError: errorPredictions,
    isLoading: loadingPredictions
  } = usePredictions();

  if (errorSummary) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Inteligência Preditiva"
          subtitle="Painel estratégico de absenteísmo, horas extras, turnover e alertas de risco."
        />
        <ErrorState
          title="Erro ao carregar indicadores"
          message="Não foi possível obter os dados analíticos consolidados. Tente novamente."
          onRetry={refetchSummary}
        />
      </div>
    );
  }

  const cards = summary?.cards;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Inteligência Preditiva"
        subtitle="Painel estratégico de absenteísmo, horas extras, turnover e alertas de risco."
      />

      {/* Aviso Obrigatório */}
      <DisclaimerBanner type="analytics" />

      {/* Barra de Filtros */}
      <AnalyticsFilterBar
        departments={departments}
        filters={filters}
        onChange={setFilters}
      />

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingSummary ? (
          <>
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </>
        ) : (
          <>
            <StatCard
              title="Taxa de Absenteísmo"
              value={cards ? `${cards.absenceRate.value.toFixed(1)}%` : '0%'}
              delta={cards?.absenceRate.delta}
              deltaLabel="vs. período anterior"
              icon={<TrendingDown className="w-5 h-5 text-blue-600" />}
            />
            <StatCard
              title="Horas Extras / Colaborador"
              value={cards ? `${cards.overtimePerEmployee.value.toFixed(1)}h` : '0h'}
              delta={cards?.overtimePerEmployee.delta}
              deltaLabel="vs. período anterior"
              icon={<Clock className="w-5 h-5 text-amber-600" />}
            />
            <StatCard
              title="Taxa de Turnover"
              value={cards ? `${cards.turnoverRate.value.toFixed(1)}%` : '0%'}
              delta={cards?.turnoverRate.delta}
              deltaLabel="vs. período anterior"
              icon={<UserX className="w-5 h-5 text-rose-600" />}
            />
            <StatCard
              title="Alertas Ativos"
              value={cards ? cards.activeAlerts.value : 0}
              delta={cards?.activeAlerts.delta}
              deltaLabel="novos alertas"
              icon={<AlertTriangle className="w-5 h-5 text-purple-600" />}
            />
          </>
        )}
      </div>

      {/* Gráfico 1: Evolução Histórica dos Indicadores */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Evolução Temporal dos Indicadores
            </h3>
            <p className="text-xs text-slate-500">
              Absenteísmo (%), Horas Extras (h/colab) e Turnover (%) ao longo dos meses.
            </p>
          </div>
        </div>
        {loadingTs ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : (
          <IndicatorsTimeseriesChart data={tsData?.timeseries || []} />
        )}
      </Card>

      {/* Grid: Comparativo por Departamento & Ranking de Hotspots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 2: Comparativo Departamentos */}
        <Card className="p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Comparativo por Departamento
            </h3>
            <p className="text-xs text-slate-500">
              Distribuição dos indicadores no mês de referência ({deptCompData?.month || '-'}).
            </p>
          </div>
          {loadingDeptComp ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : (
            <DepartmentComparisonChart data={deptCompData?.departments || []} />
          )}
        </Card>

        {/* Gráfico 3: Ranking de Risco (Hotspots) */}
        <Card className="p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Concentração de Risco por Departamento (Hotspots)
            </h3>
            <p className="text-xs text-slate-500">
              Score ponderado de 0 a 10 calculado com base em alertas ativos e severidade.
            </p>
          </div>
          {loadingHotspots ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : (
            <HotspotRankingChart data={hotspotData?.hotspots || []} />
          )}
        </Card>
      </div>

      {/* Central de Alertas */}
      <Card className="p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-purple-600" />
            Central de Alertas Preditivos
          </h3>
          <p className="text-xs text-slate-500">
            Detecção antecipada de anomalias e recomendações operacionais preventivas.
          </p>
        </div>
        <AlertsCenter
          alerts={alertsData?.alerts || []}
          departments={departments}
          isLoading={loadingAlerts}
          isRh={isRh}
        />
      </Card>

      {/* Previsões (Fase B) com fallback graceful */}
      <Card className="p-5 space-y-3 bg-gradient-to-r from-slate-50 to-indigo-50/30 border-indigo-100">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-indigo-900">
            Projeções Preditivas com Machine Learning (Fase B)
          </h3>
        </div>
        {loadingPredictions ? (
          <Skeleton className="h-16 w-full rounded-lg" />
        ) : errorPredictions || !predictionsData ? (
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900">
            <p className="font-medium mb-0.5">Modelo preditivo em calibração ou indisponível no momento.</p>
            <p className="text-amber-700">
              O microserviço preditivo (Fase B) opera em regime assíncrono. O monitoramento histórico e as regras estatísticas permanecem plenamente operacionais acima.
            </p>
          </div>
        ) : (
          <div className="text-xs text-slate-600">
            {JSON.stringify(predictionsData)}
          </div>
        )}
      </Card>
    </div>
  );
};
