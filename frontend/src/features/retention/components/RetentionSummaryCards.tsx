// frontend/src/features/retention/components/RetentionSummaryCards.tsx
import React from 'react';
import { Users, AlertTriangle, Clock, HelpCircle } from 'lucide-react';
import { RetentionSummary, AttentionLevel } from '../types';
import { cn } from '../../../lib/utils';

interface RetentionSummaryCardsProps {
  summary?: RetentionSummary;
  selectedLevel?: AttentionLevel | '';
  onSelectLevel: (level: AttentionLevel | '') => void;
  isLoading?: boolean;
}

export const RetentionSummaryCards: React.FC<RetentionSummaryCardsProps> = ({
  summary,
  selectedLevel,
  onSelectLevel,
  isLoading = false
}) => {
  const cards = [
    {
      key: '' as AttentionLevel | '',
      label: 'Colaboradores Analisados',
      value: summary ? summary.total : 0,
      icon: <Users className="w-5 h-5 text-brand-600" aria-hidden="true" />,
      bg: 'hover:border-brand-300',
      activeBorder: 'border-brand-500 bg-brand-50/40 ring-2 ring-brand-500/20',
      ariaDesc: 'Filtrar por todos os colaboradores'
    },
    {
      key: 'alta' as AttentionLevel,
      label: 'Atenção Alta',
      value: summary ? summary.alta : 0,
      icon: <AlertTriangle className="w-5 h-5 text-rose-600" aria-hidden="true" />,
      bg: 'hover:border-rose-300',
      activeBorder: 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/20',
      ariaDesc: 'Filtrar por atenção alta'
    },
    {
      key: 'moderada' as AttentionLevel,
      label: 'Atenção Moderada',
      value: summary ? summary.moderada : 0,
      icon: <Clock className="w-5 h-5 text-amber-600" aria-hidden="true" />,
      bg: 'hover:border-amber-300',
      activeBorder: 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20',
      ariaDesc: 'Filtrar por atenção moderada'
    },
    {
      key: 'insuficiente' as AttentionLevel,
      label: 'Dados Insuficientes',
      value: summary ? summary.insuficiente : 0,
      icon: <HelpCircle className="w-5 h-5 text-slate-500" aria-hidden="true" />,
      bg: 'hover:border-slate-300',
      activeBorder: 'border-slate-500 bg-slate-50 ring-2 ring-slate-400/20',
      ariaDesc: 'Filtrar por dados insuficientes'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" role="region" aria-label="Resumo por nível de atenção">
      {cards.map(card => {
        const isSelected = selectedLevel === card.key;
        return (
          <button
            key={card.label}
            type="button"
            onClick={() => onSelectLevel(isSelected && card.key !== '' ? '' : card.key)}
            aria-pressed={isSelected}
            aria-label={`${card.label}: ${card.value}. ${card.ariaDesc}`}
            className={cn(
              'p-4 rounded-xl border bg-white text-left transition-all shadow-2xs cursor-pointer flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-brand-500',
              card.bg,
              isSelected ? card.activeBorder : 'border-slate-200'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 line-clamp-1">{card.label}</span>
              <div className="p-1.5 rounded-lg bg-slate-50 shrink-0">
                {card.icon}
              </div>
            </div>

            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {isLoading ? (
                <div className="h-7 w-12 bg-slate-100 rounded animate-pulse" />
              ) : (
                card.value
              )}
            </div>

            <span className="text-[10px] text-slate-400 mt-1 block">
              {isSelected ? 'Filtro ativo (clique para limpar)' : 'Clique para filtrar'}
            </span>
          </button>
        );
      })}
    </div>
  );
};
