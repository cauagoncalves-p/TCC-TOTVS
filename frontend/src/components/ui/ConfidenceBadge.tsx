import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { Badge } from './Badge';

export interface ConfidenceBadgeProps {
  confidence: 'baixa' | 'media' | 'alta' | string;
  className?: string;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ confidence, className }) => {
  const norm = String(confidence).toLowerCase();

  if (norm === 'alta') {
    return (
      <Badge variant="success" className={className}>
        <CheckCircle2 className="w-3 h-3 text-current shrink-0" aria-hidden="true" />
        <span>Confiabilidade Alta</span>
      </Badge>
    );
  }
  if (norm === 'media' || norm === 'média') {
    return (
      <Badge variant="warning" className={className}>
        <AlertCircle className="w-3 h-3 text-current shrink-0" aria-hidden="true" />
        <span>Confiabilidade Média</span>
      </Badge>
    );
  }
  return (
    <Badge variant="danger" className={className}>
      <AlertTriangle className="w-3 h-3 text-current shrink-0" aria-hidden="true" />
      <span>Confiabilidade Baixa</span>
    </Badge>
  );
};
