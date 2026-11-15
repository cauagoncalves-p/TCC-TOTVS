import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Badge } from './Badge';

export interface PriorityBadgeProps {
  priority: 'baixa' | 'media' | 'alta' | string;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, className }) => {
  const norm = String(priority).toLowerCase();

  if (norm === 'alta') {
    return (
      <Badge variant="danger" className={className}>
        <AlertTriangle className="w-3 h-3 text-current shrink-0" aria-hidden="true" />
        <span>Prioridade Alta</span>
      </Badge>
    );
  }

  if (norm === 'media' || norm === 'média') {
    return (
      <Badge variant="warning" className={className}>
        <AlertCircle className="w-3 h-3 text-current shrink-0" aria-hidden="true" />
        <span>Prioridade Média</span>
      </Badge>
    );
  }

  return (
    <Badge variant="info" className={className}>
      <Info className="w-3 h-3 text-current shrink-0" aria-hidden="true" />
      <span>Prioridade Baixa</span>
    </Badge>
  );
};
