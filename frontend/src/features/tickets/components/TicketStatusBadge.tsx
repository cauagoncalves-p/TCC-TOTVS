import React from 'react';
import { Clock, PlayCircle, CheckCircle2, CheckCheck } from 'lucide-react';
import { TicketStatus, TicketRole } from '../types';
import { formatTicketStatus } from '../labels';
import { cn } from '../../../lib/utils';

interface TicketStatusBadgeProps {
  status: TicketStatus;
  role?: TicketRole;
  className?: string;
}

export const TicketStatusBadge: React.FC<TicketStatusBadgeProps> = ({
  status,
  role = 'colaborador',
  className
}) => {
  const label = formatTicketStatus(status, role);

  const getStatusConfig = (s: TicketStatus) => {
    switch (s) {
      case 'aberto':
        return {
          icon: <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
          styles: 'bg-amber-50 text-amber-800 border-amber-200'
        };
      case 'em_atendimento':
        return {
          icon: <PlayCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
          styles: 'bg-blue-50 text-blue-800 border-blue-200'
        };
      case 'respondido':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
          styles: 'bg-emerald-50 text-emerald-800 border-emerald-200'
        };
      case 'resolvido':
        return {
          icon: <CheckCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
          styles: 'bg-slate-100 text-slate-700 border-slate-300'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-2xs select-none',
        config.styles,
        className
      )}
      role="status"
    >
      {config.icon}
      <span>{label}</span>
    </span>
  );
};
