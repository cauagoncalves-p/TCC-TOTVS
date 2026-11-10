import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { TimeseriesPoint } from '../../../types/api';
import { formatCompetence } from '../../../lib/formatters';

interface IndicatorsTimeseriesChartProps {
  data: TimeseriesPoint[];
}

// Aggregate multiple departments by month (sum/average)
function aggregateByMonth(points: TimeseriesPoint[]) {
  const map = new Map<
    string,
    { month: string; absenceSum: number; overtimeSum: number; turnoverSum: number; count: number }
  >();

  for (const p of points) {
    const key = p.MonthRef;
    if (!map.has(key)) {
      map.set(key, { month: key, absenceSum: 0, overtimeSum: 0, turnoverSum: 0, count: 0 });
    }
    const entry = map.get(key)!;
    entry.absenceSum += p.AbsenceRate;
    entry.overtimeSum += p.OvertimePerEmployee;
    entry.turnoverSum += p.TurnoverRate;
    entry.count += 1;
  }

  return Array.from(map.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((e) => ({
      month: formatCompetence(e.month),
      Absenteísmo: parseFloat((e.absenceSum / e.count).toFixed(2)),
      'H.Extra/Colab.': parseFloat((e.overtimeSum / e.count).toFixed(2)),
      Turnover: parseFloat((e.turnoverSum / e.count).toFixed(2))
    }));
}

export const IndicatorsTimeseriesChart: React.FC<IndicatorsTimeseriesChartProps> = ({ data }) => {
  const chartData = aggregateByMonth(data);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Sem dados para o período selecionado.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(value: any, name: any) => [`${value}`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="Absenteísmo"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="H.Extra/Colab."
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="Turnover"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
