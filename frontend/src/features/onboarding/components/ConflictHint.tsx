// frontend/src/features/onboarding/components/ConflictHint.tsx
import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';

interface ConflictHintProps {
  conflictValues?: Record<string, string>;
  message?: string;
  onSelectValue?: (value: string) => void;
  disabled?: boolean;
}

export const ConflictHint: React.FC<ConflictHintProps> = ({
  conflictValues,
  message,
  onSelectValue,
  disabled = false
}) => {
  if (!conflictValues || Object.keys(conflictValues).length === 0) {
    if (!message) return null;
    return (
      <div className="mt-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-1.5">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
        <span>{message}</span>
      </div>
    );
  }

  const entries = Object.entries(conflictValues);

  return (
    <div className="mt-1.5 p-2.5 rounded-lg bg-amber-50/90 border border-amber-200 text-xs text-amber-950 space-y-1.5 animate-in fade-in">
      <div className="flex items-center gap-1.5 font-semibold text-amber-900">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
        <span>Os documentos mostram valores diferentes. Escolha um:</span>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {entries.map(([source, val]) => (
          <button
            key={source}
            type="button"
            disabled={disabled}
            onClick={() => onSelectValue?.(val)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white hover:bg-amber-100/70 border border-amber-300 text-amber-950 text-xs font-medium transition-colors shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="font-semibold capitalize text-amber-900">{source}:</span>
            <span className="truncate max-w-[150px]">{val}</span>
            <span className="text-[10px] text-amber-700 bg-amber-100 px-1 py-0.2 rounded font-semibold ml-0.5">
              Usar este valor
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
