// frontend/src/features/admin/components/UserCredentialsDialog.tsx
import React, { useState } from 'react';
import { KeyRound, Copy, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface UserCredentialsDialogProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  userEmail?: string;
  tempPassword?: string;
  onClose: () => void;
}

export const UserCredentialsDialog: React.FC<UserCredentialsDialogProps> = ({
  isOpen,
  title = 'Credencial Temporária Gerada',
  description = 'Uma senha de primeiro acesso foi gerada com sucesso.',
  userEmail,
  tempPassword,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !tempPassword) return null;

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-credentials-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-md bg-app-surface rounded-2xl shadow-2xl border border-app-border p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-900 flex items-center justify-center shrink-0">
            <KeyRound className="w-6 h-6 text-brand-500" aria-hidden="true" />
          </div>
          <div>
            <h3 id="user-credentials-title" className="text-base font-bold text-brand-900">
              {title}
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              {description}
            </p>
          </div>
        </div>

        {/* Informações de Login */}
        {userEmail && (
          <div className="bg-app-bg rounded-xl p-3.5 border border-app-border text-xs flex items-center justify-between">
            <span className="text-text-secondary font-medium">Usuário (E-mail):</span>
            <span className="font-semibold text-text-primary font-mono">{userEmail}</span>
          </div>
        )}

        {/* Caixa de Senha Temporária */}
        <div className="p-4 rounded-xl bg-risk-moderate-bg border border-risk-moderate/40 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-risk-moderate">
            <KeyRound className="w-4 h-4 text-risk-moderate" aria-hidden="true" />
            <span>Senha Temporária de Acesso</span>
          </div>

          <div className="flex items-center justify-between bg-app-surface px-3 py-2 rounded-lg border border-risk-moderate/30 shadow-2xs">
            <span className="font-mono font-bold text-base text-text-primary tracking-wider select-all">
              {tempPassword}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyPassword}
              className="h-8 px-2.5 text-xs text-brand-700 hover:text-brand-900 hover:bg-brand-100 gap-1"
              aria-label="Copiar senha temporária"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-risk-low" aria-hidden="true" />
                  <span className="text-risk-low font-semibold">Copiada!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  <span>Copiar</span>
                </>
              )}
            </Button>
          </div>

          <div className="flex items-start gap-2 text-[11px] text-risk-moderate font-medium leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-risk-moderate shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <strong>Atenção:</strong> esta senha é mostrada só agora. Ela não foi salva em cache nem poderá ser consultada novamente. Entregue-a ao colaborador para o primeiro acesso com troca obrigatória.
            </span>
          </div>
        </div>

        {/* Aviso de Segurança */}
        <div className="flex items-center gap-2 text-[11px] text-text-secondary pt-1">
          <ShieldCheck className="w-4 h-4 text-brand-500 shrink-0" />
          <span>Troca de senha obrigatória exigida logo no próximo login.</span>
        </div>

        {/* Botão de Conclusão */}
        <div className="pt-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onClose}
            className="w-full text-xs font-semibold"
          >
            Entendido e Concluído
          </Button>
        </div>
      </div>
    </div>
  );
};
