// frontend/src/features/retention/components/AttentionBadge.tsx
import React from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  HelpCircle,
  MinusCircle
} from 'lucide-react';
import { AttentionLevel } from '../types';
import { cn } from '../../../lib/utils';

interface AttentionBadgeProps {
  level: AttentionLevel;
  className?: string;
}

export const AttentionBadge: React.FC<AttentionBadgeProps> = ({ level, className }) => {
  switch (level) {
    case 'alta':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200',
            className
          )}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" aria-hidden="true" />
          <span>Alta</span>
        </span>
      );

    case 'moderada':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200',
            className
          )}
        >
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
          <span>Moderada</span>
        </span>
      );

    case 'baixa':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200',
            className
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
          <span>Baixa</span>
        </span>
      );

    case 'insuficiente':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200',
            className
          )}
        >
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
          <span>Dados insuficientes</span>
        </span>
      );

    case 'nao_aplicavel':
    default:
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200',
            className
          )}
        >
          <MinusCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
          <span>Não aplicável</span>
        </span>
      );
  }
};
