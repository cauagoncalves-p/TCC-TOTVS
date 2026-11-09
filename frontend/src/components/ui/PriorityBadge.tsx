import React from 'react';
import { Badge } from './Badge';

export interface PriorityBadgeProps {
  priority: 'baixa' | 'media' | 'alta' | string;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, className }) => {
  const norm = String(priority).toLowerCase();

  if (norm === 'alta') {
    return <Badge variant="danger" className={className}>Prioridade Alta</Badge>;
  }
  if (norm === 'media') {
    return <Badge variant="warning" className={className}>Prioridade Média</Badge>;
  }
  return <Badge variant="info" className={className}>Prioridade Baixa</Badge>;
};
