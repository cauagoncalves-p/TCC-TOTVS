import React from 'react';
import { Department } from '../../../types/api';
import { AnalyticsFilters } from '../hooks';

interface AnalyticsFilterBarProps {
  departments: Department[];
  filters: AnalyticsFilters;
  onChange: (filters: AnalyticsFilters) => void;
}

export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({
  departments,
  filters,
  onChange
}) => {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-end bg-white border border-slate-200 rounded-xl p-3 sm:px-4 sm:py-3 shadow-xs">
      {/* Período De */}
      <div className="flex flex-col gap-1 w-full sm:w-auto">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">De</label>
        <input
          type="date"
          value={filters.from}
          max={filters.to}
          onChange={(e) => onChange({ ...filters, from: e.target.value })}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
        />
      </div>

      {/* Período Até */}
      <div className="flex flex-col gap-1 w-full sm:w-auto">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Até</label>
        <input
          type="date"
          value={filters.to}
          min={filters.from}
          onChange={(e) => onChange({ ...filters, to: e.target.value })}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
        />
      </div>

      {/* Departamento */}
      <div className="flex flex-col gap-1 w-full sm:w-auto flex-1">
        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Departamento
        </label>
        <select
          value={filters.departmentId ?? ''}
          onChange={(e) =>
            onChange({ ...filters, departmentId: e.target.value ? Number(e.target.value) : null })
          }
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full min-w-0 sm:min-w-[180px]"
        >
          <option value="">Todos os departamentos</option>
          {departments.map((d) => (
            <option key={d.Id} value={d.Id}>
              {d.Name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
