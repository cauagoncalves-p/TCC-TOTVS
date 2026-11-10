import React, { useState } from 'react';
import { RefreshCw, Filter } from 'lucide-react';
import { AlertItem, Department } from '../../../types/api';
import { AlertCard } from './AlertCard';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useUpdateAlertStatus, useGenerateAlerts } from '../hooks';

interface AlertsCenterProps {
  alerts: AlertItem[];
  departments: Department[];
  isLoading: boolean;
  isRh: boolean;
}

export const AlertsCenter: React.FC<AlertsCenterProps> = ({
  alerts,
  departments,
  isLoading,
  isRh
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('');

  const updateStatusMutation = useUpdateAlertStatus();
  const generateMutation = useGenerateAlerts();

  const filteredAlerts = alerts.filter((a) => {
    if (statusFilter && a.Status !== statusFilter) return false;
    if (riskFilter && a.RiskLevel !== riskFilter) return false;
    if (deptFilter && String(a.DepartmentId) !== deptFilter) return false;
    return true;
  });

  const handleMarkRead = (id: number) => {
    updateStatusMutation.mutate({ id, status: 'lido' });
  };

  const handleMarkResolved = (id: number) => {
    updateStatusMutation.mutate({ id, status: 'resolvido' });
  };

  const handleRecalculate = () => {
    generateMutation.mutate();
  };

  return (
    <div className="space-y-4">
      {/* Header com filtros e botão recalculate */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mr-2">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="">Todos os status</option>
            <option value="novo">Novo</option>
            <option value="lido">Lido</option>
            <option value="resolvido">Resolvido</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="">Todos os riscos</option>
            <option value="alto">Alto</option>
            <option value="moderado">Moderado</option>
            <option value="baixo">Baixo</option>
          </select>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="">Todos os deptos</option>
            {departments.map((d) => (
              <option key={d.Id} value={String(d.Id)}>
                {d.Name}
              </option>
            ))}
          </select>
        </div>

        {isRh && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
            disabled={generateMutation.isPending}
            className="text-xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 mr-1.5 ${generateMutation.isPending ? 'animate-spin' : ''}`}
            />
            {generateMutation.isPending ? 'Recalculando...' : 'Recalcular alertas'}
          </Button>
        )}
      </div>

      {generateMutation.isSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs">
          Alertas recalculados com sucesso.
        </div>
      )}

      {/* Lista de Alertas */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : filteredAlerts.length === 0 ? (
        <EmptyState
          title="Nenhum alerta encontrado"
          description="Não há alertas ativos ou correspondentes aos filtros selecionados."
        />
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.Id}
              alert={alert}
              isRh={isRh}
              onMarkRead={handleMarkRead}
              onMarkResolved={handleMarkResolved}
              isUpdating={updateStatusMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
};
