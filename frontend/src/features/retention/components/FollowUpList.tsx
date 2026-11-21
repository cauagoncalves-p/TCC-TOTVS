// frontend/src/features/retention/components/FollowUpList.tsx
import React from 'react';
import { FollowUpItem } from '../types';
import { FOLLOW_UP_ACTION_LABELS } from '../labels';
import { MessageSquare, Calendar, User } from 'lucide-react';

interface FollowUpListProps {
  followUps: FollowUpItem[];
}

export const FollowUpList: React.FC<FollowUpListProps> = ({ followUps = [] }) => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Ordenação decrescente por data
  const sorted = [...followUps].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
          Histórico de Acompanhamentos ({sorted.length})
        </h5>
      </div>

      {sorted.length === 0 ? (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
          Nenhuma ação de acompanhamento registrada até o momento.
        </div>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((item) => {
            const actionLabel = FOLLOW_UP_ACTION_LABELS[item.actionType] || item.actionType;

            return (
              <div
                key={item.id}
                className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-brand-600 shrink-0" aria-hidden="true" />
                    {actionLabel}
                  </span>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" aria-hidden="true" />
                      {formatDate(item.createdAt)}
                    </span>
                    {item.createdByName && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <User className="w-3 h-3 text-slate-400" aria-hidden="true" />
                        {item.createdByName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Exibição estritamente em texto puro */}
                <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap leading-relaxed font-sans">
                  {item.note}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
