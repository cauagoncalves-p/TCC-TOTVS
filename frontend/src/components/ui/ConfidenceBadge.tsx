import React from 'react';
import { Badge } from './Badge';

export interface ConfidenceBadgeProps {
  confidence: 'baixa' | 'media' | 'alta' | string;
  className?: string;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ confidence, className }) => {
  const norm = String(confidence).toLowerCase();

  if (norm === 'alta') {
    return <Badge variant="success" className={className}>Confiabilidade Alta</Badge>;
  }
  if (norm === 'media') {
    return <Badge variant="warning" className={className}>Confiabilidade Média</Badge>;
  }
  return <Badge variant="danger" className={className}>Confiabilidade Baixa</Badge>;
};
