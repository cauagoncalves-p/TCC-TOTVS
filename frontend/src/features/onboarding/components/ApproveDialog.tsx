// frontend/src/features/onboarding/components/ApproveDialog.tsx
import React from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { CandidateData } from '../types';
import { formatDate } from '../../../lib/formatters';
import { maskCpfHidden } from '../utils/masks';
import { Button } from '../../../components/ui/Button';

interface ApproveDialogProps {
  isOpen: boolean;
  candidateData: Partial<CandidateData>;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ApproveDialog: React.FC<ApproveDialogProps> = ({
  isOpen,
  candidateData,
  isLoading = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="approve-dialog-title"
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/70">
          <div className="p-2.5 rounded-full bg-emerald-50 text-emerald-600 shrink-0">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 id="approve-dialog-title" className="text-base font-semibold text-slate-900">
              Confirmar Admissão do Colaborador
            </h3>
            <p className="text-xs text-slate-500">
              Revise o resumo dos dados antes de gerar os acessos no sistema.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600">
            Ao confirmar a aprovação, o colaborador será oficialmente cadastrado, gerando seu registro funcional, matrícula de admissão e credenciais de acesso ao portal.
          </p>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Nome Completo:</span>
              <span className="font-semibold text-slate-900">{candidateData.fullName || '-'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500">CPF (Protegido LGPD):</span>
              <span className="font-mono font-semibold text-slate-800">
                {maskCpfHidden(candidateData.cpf)}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500">E-mail (Login):</span>
              <span className="font-semibold text-slate-900">{candidateData.email || '-'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Cargo / Função:</span>
              <span className="font-semibold text-slate-900">{candidateData.jobTitle || '-'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Departamento:</span>
              <span className="font-semibold text-slate-900">{candidateData.department || '-'}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Data de Admissão:</span>
              <span className="font-semibold text-slate-900">{formatDate(candidateData.hireDate)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            className="gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            <span>Confirmar e Admitir</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
