// frontend/src/features/retention/components/ScoreBreakdown.tsx
import React from 'react';
import { ScoreComponents } from '../types';
import { Clock, CalendarX, TrendingUp } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ScoreBreakdownProps {
  components?: ScoreComponents | null;
}

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({ components }) => {
  if (!components) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
        Composição detalhada de pontuação não disponível para este colaborador (dados insuficientes ou não aplicável).
      </div>
    );
  }

  const items = [
    {
      key: 'sobrecarga',
      title: 'Sobrecarga de Trabalho',
      icon: Clock,
      data: components.sobrecarga,
      color: 'bg-amber-500',
      trackColor: 'bg-amber-100/60'
    },
    {
      key: 'ausencias',
      title: 'Faltas e Ausências',
      icon: CalendarX,
      data: components.ausencias,
      color: 'bg-rose-500',
      trackColor: 'bg-rose-100/60'
    },
    {
      key: 'estagnacao',
      title: 'Tempo sem Movimentação',
      icon: TrendingUp,
      data: components.estagnacao,
      color: 'bg-blue-500',
      trackColor: 'bg-blue-100/60'
    }
  ];

  return (
    <div className="space-y-3.5">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
        Composição da Pontuação (0 a 100 pontos)
      </h4>

      <div className="space-y-3">
        {items.map((item) => {
          const { points = 0, maxPoints = 40, phrase = '' } = item.data || {};
          const percentage = Math.min(100, Math.round((points / maxPoints) * 100));
          const Icon = item.icon;

          return (
            <div
              key={item.key}
              className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  {item.title}
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {points} <span className="font-normal text-slate-400">/ {maxPoints} pts</span>
                </span>
              </div>

              {/* Barra de Progresso */}
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-300', item.color)}
                  style={{ width: `${percentage}%` }}
                  role="progressbar"
                  aria-valuenow={points}
                  aria-valuemin={0}
                  aria-valuemax={maxPoints}
                  aria-label={`${item.title}: ${points} de ${maxPoints} pontos`}
                />
              </div>

              {/* Frase Explicativa vinda da API */}
              {phrase && (
                <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-md leading-relaxed border border-slate-100">
                  {phrase}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
