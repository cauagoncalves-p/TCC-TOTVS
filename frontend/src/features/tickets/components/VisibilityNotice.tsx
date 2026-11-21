import React from 'react';
import { ShieldAlert, Info } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface VisibilityNoticeProps {
  className?: string;
  variant?: 'form' | 'compact';
}

export const VisibilityNotice: React.FC<VisibilityNoticeProps> = ({
  className,
  variant = 'form'
}) => {
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-900',
          className
        )}
      >
        <Info className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
        <span>Seu chamado é visível para a equipe de RH. Não compartilhe senhas ou dados bancários.</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 space-y-1.5',
        className
      )}
      role="note"
      aria-label="Avisos de privacidade e segurança"
    >
      <div className="flex items-start gap-2.5">
        <Info className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-semibold text-brand-950">
            Avisos de privacidade e minimização de dados:
          </p>
          <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
            <li>Seu chamado pode ser visto por toda a equipe de RH.</li>
            <li>
              <strong>Não envie senhas</strong>, números completos de documentos (CPF, RG) nem dados bancários.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
