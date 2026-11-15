// frontend/src/features/onboarding/components/FieldProvenanceChip.tsx
import React from 'react';
import { Sparkles, Edit3, Keyboard } from 'lucide-react';
import { FieldProvenance } from '../types';

interface FieldProvenanceChipProps {
  provenance: FieldProvenance;
  className?: string;
}

export const FieldProvenanceChip: React.FC<FieldProvenanceChipProps> = ({ provenance, className = '' }) => {
  if (provenance === 'ia') {
    return (
      <span
        title="Valor extraído por IA de documento e não alterado"
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 ${className}`}
      >
        <Sparkles className="w-2.5 h-2.5 text-blue-600 shrink-0" aria-hidden="true" />
        <span>IA</span>
      </span>
    );
  }

  if (provenance === 'editado') {
    return (
      <span
        title="Valor sugerido por IA mas editado manualmente pelo analista"
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 ${className}`}
      >
        <Edit3 className="w-2.5 h-2.5 text-amber-600 shrink-0" aria-hidden="true" />
        <span>Editado</span>
      </span>
    );
  }

  return (
    <span
      title="Valor inserido manualmente pelo analista"
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
    >
      <Keyboard className="w-2.5 h-2.5 text-slate-500 shrink-0" aria-hidden="true" />
      <span>Digitado</span>
    </span>
  );
};
