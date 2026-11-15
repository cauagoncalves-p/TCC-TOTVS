import React from 'react';
import { CheckCircle2, Clock, XCircle, Info } from 'lucide-react';
import { Badge } from './Badge';

export interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const norm = String(status).toLowerCase();

  switch (norm) {
    case 'novo':
    case 'aberta':
    case 'pendente':
    case 'pendente_revisao':
      return (
        <Badge variant="warning" className={className}>
          <Clock className="w-3 h-3 text-current shrink-0" aria-hidden="true" />
          <span>{formatStatusLabel(status)}</span>
        </Badge>
      );

    case 'aprovado':
    case 'corrigida':
    case 'resolvido':
    case 'pronto_para_envio':
    case 'enviado_simulado':
    case 'concluida':
    case 'ativo':
      return (
        <Badge variant="success" className={className}>
          <CheckCircle2 className="w-3 h-3 text-current shrink-0" aria-hidden="true" />
          <span>{formatStatusLabel(status)}</span>
        </Badge>
      );

    case 'rejeitado':
    case 'com_inconsistencias':
    case 'atrasado':
    case 'desligado':
      return (
        <Badge variant="danger" className={className}>
          <XCircle className="w-3 h-3 text-current shrink-0" aria-hidden="true" />
          <span>{formatStatusLabel(status)}</span>
        </Badge>
      );

    case 'ignorada':
    case 'lido':
      return (
        <Badge variant="neutral" className={className}>
          <Info className="w-3 h-3 text-current shrink-0" aria-hidden="true" />
          <span>{formatStatusLabel(status)}</span>
        </Badge>
      );

    default:
      return (
        <Badge variant="default" className={className}>
          <Info className="w-3 h-3 text-current shrink-0" aria-hidden="true" />
          <span>{status}</span>
        </Badge>
      );
  }
};

function formatStatusLabel(status: string): string {
  const map: Record<string, string> = {
    novo: 'Novo',
    lido: 'Lido',
    resolvido: 'Resolvido',
    aberta: 'Aberta',
    corrigida: 'Corrigida',
    ignorada: 'Ignorada',
    pendente: 'Pendente',
    pendente_revisao: 'Pendente de Revisão',
    aprovado: 'Aprovado',
    rejeitado: 'Rejeitado',
    com_inconsistencias: 'Com Inconsistências',
    pronto_para_envio: 'Pronto para Envio',
    enviado_simulado: 'Envio Simulado',
    ativo: 'Ativo',
    desligado: 'Desligado'
  };
  return map[status.toLowerCase()] || status;
}
