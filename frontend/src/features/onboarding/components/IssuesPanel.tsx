// frontend/src/features/onboarding/components/IssuesPanel.tsx
import React from 'react';
import { AlertCircle, Clock, Info, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ValidationIssue } from '../types';
import { GroupedIssues, getFieldLabel } from '../utils/issues';

interface IssuesPanelProps {
  groupedIssues: GroupedIssues;
  canApprove: boolean;
  isValidating?: boolean;
  onFocusField?: (fieldName: string) => void;
  className?: string;
}

export const IssuesPanel: React.FC<IssuesPanelProps> = ({
  groupedIssues,
  canApprove,
  isValidating = false,
  onFocusField,
  className = ''
}) => {
  const { pendencias, erros, avisos, gerais } = groupedIssues;
  const totalIssues = pendencias.length + erros.length + avisos.length + gerais.length;

  const handleClickItem = (field?: string) => {
    if (!field) return;
    if (onFocusField) {
      onFocusField(field);
    } else {
      const element = document.getElementById(`field-${field}`);
      if (element) {
        element.focus();
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden ${className}`}
      aria-label="Situação do cadastro"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Situação do Cadastro
          </h3>
          {isValidating && (
            <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium animate-pulse border border-blue-200">
              Validando...
            </span>
          )}
        </div>

        <div>
          {canApprove ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              <span>Apto para aprovar</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
              <span>Pendências</span>
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* Caso esteja 100% preenchido e válido */}
        {totalIssues === 0 && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            <span className="font-medium">Nenhuma pendência ou inconsistência encontrada.</span>
          </div>
        )}

        {/* 1. Faltam Preencher (Pendências Obrigatórias) */}
        {pendencias.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-amber-900 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
              <span>Faltam preencher ({pendencias.length})</span>
            </div>
            <ul className="space-y-1">
              {pendencias.map((issue, idx) => (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() => handleClickItem(issue.field)}
                    className="w-full text-left p-2 rounded-lg bg-amber-50/60 hover:bg-amber-100/70 border border-amber-200/80 transition-colors flex items-start gap-1.5 group"
                  >
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-200/70 px-1 py-0.5 rounded shrink-0 uppercase">
                      {getFieldLabel(issue.field)}
                    </span>
                    <span className="text-amber-800 text-xs group-hover:text-amber-950">
                      {issue.message}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 2. Erros de Validação (Valores Inválidos) */}
        {erros.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-rose-900 text-xs">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
              <span>Erros cadastrais ({erros.length})</span>
            </div>
            <ul className="space-y-1">
              {erros.map((issue, idx) => (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() => handleClickItem(issue.field)}
                    className="w-full text-left p-2 rounded-lg bg-rose-50/60 hover:bg-rose-100/70 border border-rose-200/80 transition-colors flex items-start gap-1.5 group"
                  >
                    <span className="text-[10px] font-bold text-rose-900 bg-rose-200/70 px-1 py-0.5 rounded shrink-0 uppercase">
                      {getFieldLabel(issue.field)}
                    </span>
                    <span className="text-rose-800 text-xs group-hover:text-rose-950">
                      {issue.message}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 3. Avisos (Conflitos / Não confirmado no documento) */}
        {avisos.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-blue-900 text-xs">
              <Info className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
              <span>Avisos ({avisos.length})</span>
            </div>
            <ul className="space-y-1">
              {avisos.map((issue, idx) => (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() => handleClickItem(issue.field)}
                    className="w-full text-left p-2 rounded-lg bg-blue-50/60 hover:bg-blue-100/70 border border-blue-200/80 transition-colors flex items-start gap-1.5 group"
                  >
                    {issue.field && (
                      <span className="text-[10px] font-bold text-blue-900 bg-blue-200/70 px-1 py-0.5 rounded shrink-0 uppercase">
                        {getFieldLabel(issue.field)}
                      </span>
                    )}
                    <span className="text-blue-800 text-xs group-hover:text-blue-950">
                      {issue.message}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 4. Ocorrências gerais sem campo associado */}
        {gerais.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              <span>Gerais</span>
            </div>
            <ul className="space-y-1">
              {gerais.map((issue, idx) => (
                <li key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rodapé explicativo para aprovação */}
        <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500">
          {!canApprove ? (
            <p className="text-amber-800 font-medium">
              * Para aprovar, corrija os erros e preencha os campos obrigatórios.
            </p>
          ) : (
            <p className="text-emerald-700 font-medium">
              * Todos os requisitos obrigatórios foram cumpridos. A aprovação está liberada.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
