import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { DepartmentComparison } from '../api';
import { chartColors } from '../../../styles/chartColors';

interface DepartmentComparisonChartProps {
  data: DepartmentComparison[];
}

export const DepartmentComparisonChart: React.FC<DepartmentComparisonChartProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Sem dados disponíveis.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.DepartmentName.length > 12 ? d.DepartmentName.slice(0, 12) + '…' : d.DepartmentName,
    fullName: d.DepartmentName,
    Absenteísmo: parseFloat(d.AbsenceRate.toFixed(2)),
    'H.Extra/Colab.': parseFloat(d.OvertimePerEmployee.toFixed(2)),
    Turnover: parseFloat(d.TurnoverRate.toFixed(2))
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.gridLight} />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: chartColors.grid }}
          labelFormatter={(label, payload) => {
            const item = payload?.[0]?.payload;
            return item?.fullName ?? label;
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Absenteísmo" fill={chartColors.brandPrimary} radius={[3, 3, 0, 0]} />
        <Bar dataKey="H.Extra/Colab." fill={chartColors.amberChart} radius={[3, 3, 0, 0]} />
        <Bar dataKey="Turnover" fill={chartColors.redChart} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
