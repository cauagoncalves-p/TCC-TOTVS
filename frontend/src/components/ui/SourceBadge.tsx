import React from 'react';
import { ShieldCheck, HelpCircle } from 'lucide-react';
import { Badge } from './Badge';

export interface SourceBadgeProps {
  sourceType: 'interna' | 'oficial' | string;
  sourceVerified?: boolean;
  className?: string;
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({
  sourceType,
  sourceVerified = false,
  className
}) => {
  if (sourceType === 'interna') {
    return (
      <Badge variant="default" className={className}>
        <ShieldCheck className="w-3 h-3 text-current shrink-0" aria-hidden="true" />
        <span>Regra interna</span>
      </Badge>
    );
  }

  if (sourceVerified) {
    return (
      <Badge variant="success" className={className}>
        <ShieldCheck className="w-3 h-3 text-current shrink-0" aria-hidden="true" />
        <span>Fonte oficial (verificada)</span>
      </Badge>
    );
  }

  return (
    <Badge variant="warning" className={className}>
      <HelpCircle className="w-3 h-3 text-current shrink-0" aria-hidden="true" />
      <span>Fonte oficial (a conferir)</span>
    </Badge>
  );
};
