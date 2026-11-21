// frontend/src/features/retention/components/MonthlyComparisonChart.tsx
import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { MonthlySeriesPoint } from '../types';
import { CalendarX, Clock, Info } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface MonthlyComparisonChartProps {
  series: MonthlySeriesPoint[];
  a11ySummary?: string;
}

export const MonthlyComparisonChart: React.FC<MonthlyComparisonChartProps> = ({
  series,
  a11ySummary
}) => {
  const [metric, setMetric] = useState<'absences' | 'overtime'>('absences');

  // Formatação amigável do mês (ex.: 2026-03 -> mar/26)
  const formatMonthLabel = (mStr: string) => {
    if (!mStr || mStr.length < 7) return mStr;
    const [year, month] = mStr.split('-');
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const idx = parseInt(month, 10) - 1;
    return `${months[idx] || month}/${year.slice(2)}`;
  };

  const chartData = series.map((s) => ({
    rawMonth: s.month,
    formattedMonth: formatMonthLabel(s.month),
    personVal: metric === 'absences' ? s.personAbsences : s.personOvertime,
    deptVal: metric === 'absences' ? s.deptMedianAbsences : s.deptMedianOvertime
  }));

  const metricTitle = metric === 'absences' ? 'Faltas e Ausências (dias)' : 'Horas Extras (h/mês)';
  const personLegend = metric === 'absences' ? 'Colaborador (dias de falta)' : 'Colaborador (horas extras)';
  const deptLegend = 'Mediana do Departamento';

  return (
    <div className="space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Histórico de 12 Meses vs Mediana do Setor
        </h4>

        {/* Alternador de Métrica */}
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
          <button
            type="button"
            onClick={() => setMetric('absences')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all text-xs',
              metric === 'absences'
                ? 'bg-white text-brand-900 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            <CalendarX className="w-3.5 h-3.5 text-rose-500" aria-hidden="true" />
            <span>Faltas</span>
          </button>
          <button
            type="button"
            onClick={() => setMetric('overtime')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all text-xs',
              metric === 'overtime'
                ? 'bg-white text-brand-900 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
            <span>Horas Extras</span>
          </button>
        </div>
      </div>

      {/* Gráfico Recharts */}
      <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
        <div className="text-[11px] font-semibold text-slate-600 mb-2 flex items-center justify-between">
          <span>{metricTitle}</span>
          <span className="text-[10px] text-slate-400 font-normal italic">
            * Meses com lacuna indicam ausência de registro ou afastamento
          </span>
        </div>

        <div className="h-56 w-full" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="formattedMonth"
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={true}
              />
              <Tooltip
                formatter={(value: any, name: any) => [
                  value !== null && value !== undefined ? `${value} ${metric === 'absences' ? 'dias' : 'h'}` : 'Sem registro',
                  name === 'personVal' ? personLegend : deptLegend
                ]}
                labelFormatter={(label: any) => `Mês: ${label}`}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '0.5rem',
                  fontSize: '11px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={24}
                formatter={(val) => (
                  <span className="text-[11px] text-slate-600 font-medium">
                    {val === 'personVal' ? personLegend : deptLegend}
                  </span>
                )}
              />
              <Line
                type="monotone"
                dataKey="personVal"
                stroke={metric === 'absences' ? '#e11d48' : '#d97706'}
                strokeWidth={2.5}
                dot={{ r: 3, fill: metric === 'absences' ? '#e11d48' : '#d97706' }}
                activeDot={{ r: 5 }}
                connectNulls={false}
                name="personVal"
              />
              <Line
                type="monotone"
                dataKey="deptVal"
                stroke="#64748b"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                name="deptVal"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Resumo em Texto Acessível (Obrigatório conforme PARTE5G para VLibras / Leitores de Tela) */}
      {a11ySummary && (
        <div
          className="flex items-start gap-2 p-3 bg-blue-50/60 border border-blue-200/70 rounded-xl text-xs text-blue-900 leading-relaxed"
          role="note"
          aria-label="Resumo em texto do histórico"
        >
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <strong className="font-semibold block text-[11px] text-blue-950 uppercase tracking-wide">
              Resumo Textual Acessível:
            </strong>
            <p className="text-xs text-blue-800 mt-0.5">{a11ySummary}</p>
          </div>
        </div>
      )}
    </div>
  );
};
