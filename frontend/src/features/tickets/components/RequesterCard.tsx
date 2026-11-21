import React from 'react';
import { User, Building2, Briefcase, Hash } from 'lucide-react';
import { TicketRequester } from '../types';

interface RequesterCardProps {
  requester: TicketRequester;
}

export const RequesterCard: React.FC<RequesterCardProps> = ({ requester }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Colaborador</h3>
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <User className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Nome</p>
            <p className="text-sm font-semibold text-slate-800 break-words">{requester.fullName || '—'}</p>
          </div>
        </div>
        {requester.registration && (
          <div className="flex items-start gap-2">
            <Hash className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Matrícula</p>
              <p className="text-sm font-medium text-slate-800">{requester.registration}</p>
            </div>
          </div>
        )}
        {requester.department && (
          <div className="flex items-start gap-2">
            <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Departamento</p>
              <p className="text-sm font-medium text-slate-800 break-words">{requester.department}</p>
            </div>
          </div>
        )}
        {requester.jobTitle && (
          <div className="flex items-start gap-2">
            <Briefcase className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Cargo</p>
              <p className="text-sm font-medium text-slate-800 break-words">{requester.jobTitle}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
