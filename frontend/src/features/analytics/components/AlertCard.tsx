import React from 'react';
import { CheckCircle2, Eye } from 'lucide-react';
import { AlertItem } from '../../../types/api';
import { RiskBadge } from '../../../components/ui/RiskBadge';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { formatCompetence } from '../../../lib/formatters';

interface AlertCardProps {
  alert: AlertItem;
  isRh: boolean;
  onMarkRead?: (id: number) => void;
  onMarkResolved?: (id: number) => void;
  isUpdating?: boolean;
}

function parseIndicators(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function statusLabel(s: string): string {
  if (s === 'novo') return 'Novo';
  if (s === 'lido') return 'Lido';
  if (s === 'resolvido') return 'Resolvido';
  return s;
}

function statusColor(s: string): string {
  if (s === 'novo') return 'bg-blue-100 text-blue-700';
  if (s === 'lido') return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}

export const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  isRh,
  onMarkRead,
  onMarkResolved,
  isUpdating
}) => {
  const indicators = alert.indicators ?? parseIndicators(alert.IndicatorsJson);
  const canMarkRead = alert.Status === 'novo';
  const canMarkResolved = alert.Status !== 'resolvido';
  // gestor can also mark alerts — only generate is rh-only per spec

  return (
    <Card className="p-4 space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <RiskBadge level={alert.RiskLevel} />
          <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
            {alert.RuleCode}
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded ${statusColor(alert.Status)}`}
          >
            {statusLabel(alert.Status)}
          </span>
        </div>
        <span className="text-xs text-slate-400">
          {alert.DepartmentName} · {formatCompetence(alert.ReferenceMonth)}
        </span>
      </div>

      {/* Justificativa */}
      <p className="text-sm text-slate-700 leading-relaxed">{alert.Justification}</p>

      {/* Recomendação */}
      <p className="text-xs text-slate-500 leading-relaxed">
        <span className="font-semibold text-slate-600">Recomendação: </span>
        {alert.Recommendation}
      </p>

      {/* Indicadores */}
      {Object.keys(indicators).length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(indicators).map(([k, v]) => (
            <div key={k} className="bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs">
              <div className="text-slate-400 capitalize">{k}</div>
              <div className="font-semibold text-slate-700">{String(v)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {canMarkRead && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isUpdating}
            onClick={() => onMarkRead?.(alert.Id)}
            className="text-xs"
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            Marcar lido
          </Button>
        )}
        {canMarkResolved && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isUpdating}
            onClick={() => onMarkResolved?.(alert.Id)}
            className="text-xs text-emerald-700 hover:text-emerald-800"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Marcar resolvido
          </Button>
        )}
      </div>
    </Card>
  );
};
