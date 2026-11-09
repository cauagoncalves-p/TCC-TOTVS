import React from 'react';
import { Info } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DisclaimerBannerProps {
  type?: 'onboarding' | 'analytics' | 'esocial' | 'assistant' | 'obligations' | 'custom';
  message?: string;
  className?: string;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({
  type = 'custom',
  message,
  className
}) => {
  const defaultMessages = {
    onboarding: 'Dados extraídos por IA. Revise os campos antes de aprovar a admissão.',
    analytics: 'Apoio à decisão gerencial. Indicadores agregados que não devem ser utilizados como justificativa para ações individuais.',
    esocial: 'Verificação preventiva do sistema. Não substitui a validação oficial do eSocial nem a análise de um profissional.',
    assistant: 'Apoio à consulta. As respostas geradas pela IA não substituem a análise jurídica de um profissional de legislação trabalhista.',
    obligations: 'Prazos de demonstração e ilustrativos. Confira sempre o calendário tributário e trabalhista vigente na fonte oficial.',
    custom: message || 'Aviso informativo do sistema.'
  };

  const text = message || defaultMessages[type];

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-blue-50 border border-blue-200/80 text-xs text-blue-900',
        className
      )}
    >
      <Info className="w-4 h-4 text-blue-600 shrink-0" />
      <span>{text}</span>
    </div>
  );
};
