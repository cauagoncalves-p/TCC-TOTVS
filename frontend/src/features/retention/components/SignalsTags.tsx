// frontend/src/features/retention/components/SignalsTags.tsx
import React from 'react';

interface SignalsTagsProps {
  signals: string[];
}

export const SignalsTags: React.FC<SignalsTagsProps> = ({ signals }) => {
  if (!signals || signals.length === 0) {
    return <span className="text-xs text-slate-400 italic">Sem sinais de alerta</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {signals.map((sig, idx) => (
        <span
          key={idx}
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60 leading-tight"
        >
          {sig}
        </span>
      ))}
    </div>
  );
};
