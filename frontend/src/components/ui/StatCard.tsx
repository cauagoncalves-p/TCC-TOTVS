import React, { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from './Card';
import { cn } from '../../lib/utils';

export interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  delta?: number | null;
  deltaLabel?: string;
  icon?: ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  delta,
  deltaLabel = 'vs. período anterior',
  icon,
  className
}) => {
  const hasDelta = delta !== undefined && delta !== null;
  const isPositive = hasDelta && delta > 0;
  const isNegative = hasDelta && delta < 0;

  return (
    <Card className={cn('p-5 transition-shadow hover:shadow-md', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</span>
        {icon && <div className="p-2 rounded-lg bg-slate-50 text-slate-600">{icon}</div>}
      </div>

      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
        {unit && <span className="text-xs font-normal text-slate-500">{unit}</span>}
      </div>

      {hasDelta && (
        <div className="flex items-center gap-1.5 text-xs">
          {isPositive && (
            <span className="flex items-center text-rose-600 font-medium">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
              +{delta}
            </span>
          )}
          {isNegative && (
            <span className="flex items-center text-emerald-600 font-medium">
              <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
              {delta}
            </span>
          )}
          {!isPositive && !isNegative && (
            <span className="flex items-center text-slate-500 font-medium">
              <Minus className="w-3.5 h-3.5 mr-0.5" />
              0.0
            </span>
          )}
          <span className="text-slate-400 text-[11px]">{deltaLabel}</span>
        </div>
      )}
    </Card>
  );
};
