// frontend/src/features/retention/components/RestrictedNotice.tsx
import React from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

export const RestrictedNotice: React.FC = () => {
  return (
    <div
      role="region"
      aria-label="Aviso de uso restrito e confidencialidade"
      className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs"
    >
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" aria-hidden="true" />
        <div className="space-y-0.5">
          <p className="font-semibold text-blue-900 leading-snug">
            Uso restrito ao RH • Apoio à retenção e cuidado com as equipes
          </p>
          <p className="text-[11px] text-blue-700 leading-relaxed">
            Indicadores preditivos de carga e ausência. <strong>Nunca</strong> usar como base para demissão, punição, corte de benefícios ou avaliação disciplinar.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-blue-800/90 font-medium bg-blue-100/70 px-2.5 py-1 rounded-lg shrink-0 self-start sm:self-auto">
        <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
        <span>Os acessos a esta tela são registrados em auditoria</span>
      </div>
    </div>
  );
};
