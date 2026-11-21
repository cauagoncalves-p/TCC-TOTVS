// frontend/src/features/onboarding/components/CredentialsDialog.tsx
import React, { useState } from 'react';
import { CheckCircle2, Lock, Copy, Check, AlertTriangle } from 'lucide-react';
import { OnboardingApprovalResult } from '../types';
import { Button } from '../../../components/ui/Button';

interface CredentialsDialogProps {
  isOpen: boolean;
  approvalResult: OnboardingApprovalResult;
  candidateEmail?: string;
  onClose: () => void;
}

export const CredentialsDialog: React.FC<CredentialsDialogProps> = ({
  isOpen,
  approvalResult,
  candidateEmail,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyPassword = () => {
    if (approvalResult.initialPassword) {
      navigator.clipboard.writeText(approvalResult.initialPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="credentials-dialog-title"
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
          </div>
          <div>
            <h3 id="credentials-dialog-title" className="text-base font-bold text-slate-900">
              Colaborador Admitido com Sucesso!
            </h3>
            <p className="text-xs text-slate-500">
              Registro funcional criado e acessos gerados.
            </p>
          </div>
        </div>

        {/* Informações Funcionais */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Matrícula Gerada:</span>
            <span className="font-mono font-bold text-slate-900 text-sm bg-white px-2 py-0.5 rounded border border-slate-200">
              {approvalResult.registration}
            </span>
          </div>
          {candidateEmail && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500">E-mail de Acesso (Login):</span>
              <span className="font-semibold text-slate-800">{candidateEmail}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-slate-500">ID do Colaborador:</span>
            <span className="font-mono font-medium text-slate-700">#{approvalResult.employeeId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">ID de Usuário:</span>
            <span className="font-mono font-medium text-slate-700">#{approvalResult.userId}</span>
          </div>
        </div>

        {/* Senha Temporária (exibida UMA ÚNICA VEZ) */}
        {approvalResult.initialPassword && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
              <Lock className="w-4 h-4 text-amber-600" aria-hidden="true" />
              <span>Senha Temporária de Primeiro Acesso</span>
            </div>

            <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-amber-300 shadow-2xs">
              <span className="font-mono font-bold text-base text-slate-900 tracking-wider">
                {approvalResult.initialPassword}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyPassword}
                className="h-8 px-2.5 text-xs text-amber-800 hover:text-amber-950 hover:bg-amber-100 gap-1"
                aria-label="Copiar senha temporária"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                    <span className="text-emerald-700 font-semibold">Copiada!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" aria-hidden="true" />
                    <span>Copiar</span>
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-start gap-1.5 text-[11px] text-amber-900 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Anote agora, ela não será mostrada de novo. Repasse ao colaborador para o primeiro acesso.
              </span>
            </div>
          </div>
        )}

        {/* Action */}
        <div className="pt-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onClose}
            className="w-full text-xs font-semibold"
          >
            Concluir e Voltar para Lista de Casos
          </Button>
        </div>
      </div>
    </div>
  );
};
