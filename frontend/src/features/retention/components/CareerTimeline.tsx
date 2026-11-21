// frontend/src/features/retention/components/CareerTimeline.tsx
import React from 'react';
import { CareerEventItem } from '../types';
import { CAREER_EVENT_LABELS } from '../labels';
import { Award, Briefcase, Calendar, CheckCircle2, UserCheck } from 'lucide-react';

interface CareerTimelineProps {
  careerHistory: CareerEventItem[];
  admissionDate?: string;
}

export const CareerTimeline: React.FC<CareerTimelineProps> = ({
  careerHistory = []
}) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'admissao':
        return UserCheck;
      case 'promocao':
        return Award;
      case 'mudanca_cargo':
        return Briefcase;
      case 'reajuste':
      default:
        return CheckCircle2;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Ordena por data decrescente (mais recente no topo)
  const sorted = [...careerHistory].sort((a, b) => {
    return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
  });

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Trajetória e Movimentações Funcionais
        </h4>
        <span className="text-[10px] text-slate-400 italic">
          * Apenas eventos funcionais (sem valores financeiros)
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
          Nenhuma movimentação registrada no histórico funcional.
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {sorted.map((event) => {
            const Icon = getEventIcon(event.eventType);
            const eventLabel = CAREER_EVENT_LABELS[event.eventType] || event.eventType;

            return (
              <div key={event.id} className="relative group">
                {/* Marcador do ponto na linha */}
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-brand-500 flex items-center justify-center text-brand-600 shadow-2xs group-hover:scale-110 transition-transform">
                  <Icon className="w-2.5 h-2.5" aria-hidden="true" />
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 shadow-2xs hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900">{eventLabel}</span>
                    <span className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                      <Calendar className="w-3 h-3 text-slate-400" aria-hidden="true" />
                      {formatDate(event.eventDate)}
                    </span>
                  </div>

                  {event.newJobTitle && (
                    <div className="text-xs text-slate-700 font-medium">
                      Novo cargo: <span className="text-brand-900">{event.newJobTitle}</span>
                    </div>
                  )}

                  {event.note && (
                    <p className="text-[11px] text-slate-500 italic mt-0.5">{event.note}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
