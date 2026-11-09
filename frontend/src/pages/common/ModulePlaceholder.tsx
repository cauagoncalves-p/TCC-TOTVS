import React from 'react';
import { Card } from '../../components/ui/Card';
import { Construction } from 'lucide-react';

export interface ModulePlaceholderProps {
  title: string;
  phase: string;
  description: string;
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  title,
  phase,
  description
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          {phase}
        </span>
      </div>

      <Card className="p-12 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <Construction className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Módulo Estruturado (FASE F0 Concluída)</h3>
        <p className="text-xs text-slate-500 max-w-md leading-relaxed">
          A base de autenticação, controle de rotas por perfil e clientes HTTP estão prontos. A interface completa deste módulo será integrada nas fases subsequentes (F1 a F4).
        </p>
      </Card>
    </div>
  );
};
