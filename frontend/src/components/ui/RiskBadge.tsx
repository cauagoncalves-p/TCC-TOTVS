import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from './Badge';

export interface RiskBadgeProps {
  level: 'baixo' | 'moderado' | 'alto' | string;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, className }) => {
  const normalized = String(level).toLowerCase();

  if (normalized === 'alto') {
    return (
      <Badge variant="danger" className={className}>
        <AlertTriangle className="w-3 h-3 text-red-600" />
        <span>Risco Alto</span>
      </Badge>
    );
  }

  if (normalized === 'moderado') {
    return (
      <Badge variant="warning" className={className}>
        <AlertCircle className="w-3 h-3 text-amber-600" />
        <span>Risco Moderado</span>
      </Badge>
    );
  }

  return (
    <Badge variant="success" className={className}>
      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
      <span>Risco Baixo</span>
    </Badge>
  );
};
