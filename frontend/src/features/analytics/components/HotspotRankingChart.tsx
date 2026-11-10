import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer
} from 'recharts';
import { Hotspot } from '../../../types/api';

interface HotspotRankingChartProps {
  data: Hotspot[];
}

function riskColor(score: number): string {
  if (score >= 7) return '#ef4444'; // alto
  if (score >= 4) return '#f59e0b'; // moderado
  return '#10b981'; // baixo
}

export const HotspotRankingChart: React.FC<HotspotRankingChartProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Nenhum hotspot identificado.
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.RiskScore - a.RiskScore);
  const chartData = sorted.map((h) => ({
    name: h.DepartmentName.length > 14 ? h.DepartmentName.slice(0, 14) + '…' : h.DepartmentName,
    fullName: h.DepartmentName,
    score: parseFloat(h.RiskScore.toFixed(2)),
    alerts: h.ActiveAlertsCount,
    high: h.HighRiskCount,
    moderate: h.ModerateRiskCount
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 42)}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11 }} />
        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(value: any, _name: any, props: any) => {
            const item = props?.payload;
            return [
              `Score ${value} | ${item?.alerts ?? 0} alertas (${item?.high ?? 0} alto, ${item?.moderate ?? 0} mod.)`,
              item?.fullName ?? ''
            ];
          }}
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={riskColor(entry.score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
