import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Clock,
  Filter,
  Play
} from 'lucide-react';
import { ComplianceIssue, ComplianceRun } from '../../../types/api';
import { StatCard } from '../../../components/ui/StatCard';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatDate } from '../../../lib/formatters';

interface ComplianceDashboardTabProps {
  issues: ComplianceIssue[];
  runs: ComplianceRun[];
  upcomingObligationsCount?: number;
  isLoading: boolean;
  isRh: boolean;
  onExecuteRun: () => void;
  isExecutingRun: boolean;
}

export const ComplianceDashboardTab: React.FC<ComplianceDashboardTabProps> = ({
  issues,
  runs,
  upcomingObligationsCount = 2,
  isLoading,
  isRh,
  onExecuteRun,
  isExecutingRun
}) => {
  // Filtros de período e departamento
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  // Lista única de departamentos
  const departments = Array.from(
    new Set(issues.map((i) => i.EmployeeDepartment).filter(Boolean))
  ) as string[];

  // Aplicação dos filtros locais de período e departamento
  const filteredIssues = issues.filter((i) => {
    if (selectedDept && i.EmployeeDepartment !== selectedDept) return false;
    if (dateFrom && i.DetectedAt && i.DetectedAt.slice(0, 10) < dateFrom) return false;
    if (dateTo && i.DetectedAt && i.DetectedAt.slice(0, 10) > dateTo) return false;
    return true;
  });

  // Cálculos de métricas
  const totalAnalyzed = runs.length > 0 ? runs[0].RecordsAnalyzed || 0 : 0;
  const openIssues = filteredIssues.filter((i) => i.Status === 'aberta');
  const resolvedIssues = filteredIssues.filter((i) => i.Status === 'corrigida');
  const ignoredIssues = filteredIssues.filter((i) => i.Status === 'ignorada');

  const complianceRate =
    totalAnalyzed > 0
      ? Math.max(0, Math.round(((totalAnalyzed - openIssues.length) / totalAnalyzed) * 100))
      : 100;

  // Gráfico 1: Inconsistências por Prioridade
  const priorityCount = {
    Alta: openIssues.filter((i) => i.Priority === 'alta').length,
    Média: openIssues.filter((i) => i.Priority === 'media').length,
    Baixa: openIssues.filter((i) => i.Priority === 'baixa').length
  };

  const priorityChartData = [
    { name: 'Alta', count: priorityCount.Alta, color: '#ef4444' },
    { name: 'Média', count: priorityCount.Média, color: '#f59e0b' },
    { name: 'Baixa', count: priorityCount.Baixa, color: '#3b82f6' }
  ];

  // Gráfico 2: Top Regras com Inconsistências
  const ruleCounts = new Map<string, { code: string; title: string; count: number }>();
  for (const issue of openIssues) {
    const key = issue.RuleCode;
    if (!ruleCounts.has(key)) {
      ruleCounts.set(key, { code: key, title: issue.RuleTitle, count: 0 });
    }
    ruleCounts.get(key)!.count += 1;
  }
  const topRulesData = Array.from(ruleCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((r) => ({
      name: r.code,
      title: r.title,
      count: r.count
    }));

  // Gráfico 3: Histórico de Auditorias
  const historyChartData = [...runs]
    .reverse()
    .slice(-7)
    .map((r) => ({
      data: formatDate(r.StartedAt),
      Abertas: r.IssuesOpen || 0,
      Novas: r.IssuesNew || 0
    }));

  // Gráfico 4: Conformidade por Departamento
  const deptComplianceMap = new Map<string, { total: number; open: number }>();
  for (const issue of issues) {
    const dept = issue.EmployeeDepartment || 'Outros';
    if (!deptComplianceMap.has(dept)) {
      deptComplianceMap.set(dept, { total: 0, open: 0 });
    }
    const entry = deptComplianceMap.get(dept)!;
    entry.total += 1;
    if (issue.Status === 'aberta') {
      entry.open += 1;
    }
  }

  const deptChartData = Array.from(deptComplianceMap.entries()).map(([dept, val]) => {
    const rate = val.total > 0 ? Math.round(((val.total - val.open) / val.total) * 100) : 100;
    return {
      department: dept.length > 12 ? dept.slice(0, 12) + '…' : dept,
      fullName: dept,
      Conformidade: rate,
      Pendências: val.open
    };
  });

  return (
    <div className="space-y-6">
      {/* Barra de Filtros de Período e Departamento */}
      <div className="flex flex-wrap items-end justify-between gap-3 bg-white p-3.5 border border-slate-200 rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros do Dashboard:</span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase">
              Departamento
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
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

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase">
              De
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase">
              Até
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
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
            {isExecutingRun ? 'Executando auditoria...' : 'Executar auditoria cadastral'}
          </Button>
        )}
      </div>

      {/* Cards de Métricas Principais (F4b) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Conformidade Geral"
          value={`${complianceRate}%`}
          delta={runs.length > 1 ? complianceRate - 85 : null}
          deltaLabel="meta 100%"
          icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="Registros Analisados"
          value={totalAnalyzed}
          deltaLabel="última execução"
          icon={<FileSearch className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          title="Inconsistências Abertas"
          value={openIssues.length}
          deltaLabel={`${priorityCount.Alta} de alta prioridade`}
          icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
        />
        <StatCard
          title="Inconsistências Corrigidas"
          value={resolvedIssues.length}
          deltaLabel={`${ignoredIssues.length} justificadas`}
          icon={<CheckCircle2 className="w-5 h-5 text-purple-600" />}
        />
        <StatCard
          title="Obrigações Próximas"
          value={upcomingObligationsCount}
          deltaLabel="vencem em até 10 dias"
          icon={<Clock className="w-5 h-5 text-amber-600" />}
        />
      </div>

      {/* Gráficos em Grid 2x2 (F4b) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Inconsistências por Prioridade */}
        <Card className="p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Inconsistências Abertas por Severidade
            </h3>
            <p className="text-xs text-slate-500">
              Distribuição das pendências ativas por grau de criticidade legal.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={priorityChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {priorityChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Gráfico 2: Top Regras com Inconsistências */}
        <Card className="p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Regras com Maior Número de Apontamentos
            </h3>
            <p className="text-xs text-slate-500">
              Classificação das regras trabalhistas/eSocial mais violadas.
            </p>
          </div>
          {topRulesData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-xs">
              Nenhuma inconsistência ativa.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                layout="vertical"
                data={topRulesData}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(val: any, _name: any, p: any) => [
                    `${val} ocorrências`,
                    p?.payload?.title || ''
                  ]}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Gráfico 3: Histórico de Auditorias */}
        <Card className="p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Evolução Histórica de Auditorias
            </h3>
            <p className="text-xs text-slate-500">
              Total de inconsistências abertas e novas pendências detectadas por rodada.
            </p>
          </div>
          {historyChartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-xs">
              Sem execuções históricas suficientes.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={historyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="Abertas"
                  stroke="#ef4444"
                  strokeWidth={2}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="Novas"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Gráfico 4: Conformidade por Departamento */}
        <Card className="p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Índice de Conformidade por Departamento (%)
            </h3>
            <p className="text-xs text-slate-500">
              Percentual de colaboradores e rotinas em conformidade legal.
            </p>
          </div>
          {deptChartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-xs">
              Sem dados departamentais.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={deptChartData} margin={{ top: 10, right: 20, left: 0, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(val: any, name: any) => [
                    name === 'Conformidade' ? `${val}%` : val,
                    name
                  ]}
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName || _label}
                />
                <Bar dataKey="Conformidade" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
};
