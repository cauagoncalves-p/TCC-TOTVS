// frontend/src/features/admin/components/ChangePasswordModal.tsx
import React, { useState } from 'react';
import { KeyRound, X, Check, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { authService } from '../../../services/authService';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  // Validações em tempo real
  const hasMinLength = newPassword.length >= 8;
  const hasLetters = /[a-zA-Z]/.test(newPassword);
  const hasNumbers = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError('Informe sua senha atual.');
      return;
    }

    if (!hasMinLength || !hasLetters || !hasNumbers) {
      setError('A nova senha deve ter no mínimo 8 caracteres e conter letras e números.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação da nova senha não confere.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('A nova senha deve ser diferente da senha atual.');
      return;
    }

    setIsLoading(true);

    try {
      await authService.changePassword(currentPassword, newPassword);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      }, 2000);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Erro ao alterar a senha.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-modal-title"
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-md bg-app-surface rounded-2xl shadow-2xl border border-app-border p-6 space-y-5">
        <button
          onClick={handleClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-app-bg transition-colors"
          title="Fechar"
          aria-label="Fechar diálogo"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-900 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-brand-500" />
          </div>
          <div>
            <h3 id="change-password-modal-title" className="text-base font-bold text-brand-900">
              Alterar Minha Senha
            </h3>
            <p className="text-xs text-text-secondary">
              Defina uma nova credencial segura para a sua conta.
            </p>
          </div>
        </div>

        {success ? (
          <div className="p-4 rounded-xl bg-risk-low-bg border border-risk-low/40 text-risk-low flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-6 h-6 shrink-0 text-risk-low" />
            <div className="text-xs">
              <span className="font-bold block">Senha alterada com sucesso!</span>
              <span className="text-[11px] text-risk-low/90">Sua nova credencial já está ativa.</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <div className="p-3 text-xs bg-risk-high-bg border border-risk-high/30 rounded-lg text-risk-high flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-risk-high" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <Input
                label="Senha Atual"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <Input
                label="Nova Senha"
                type="password"
                placeholder="Mínimo 8 caracteres com letras e números"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <Input
                label="Confirmar Nova Senha"
                type="password"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            {/* Checklist de requisitos de segurança */}
            <div className="p-3 rounded-xl bg-app-bg border border-app-border space-y-1.5 text-[11px]">
              <span className="font-semibold text-text-primary block mb-1">Requisitos de segurança:</span>
              <div className="flex items-center gap-2 text-text-secondary">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${hasMinLength ? 'bg-risk-low-bg text-risk-low' : 'bg-slate-200 text-slate-500'}`}>
                  {hasMinLength ? <Check className="w-2.5 h-2.5" /> : '•'}
                </span>
                <span>Pelo menos 8 caracteres</span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${hasLetters && hasNumbers ? 'bg-risk-low-bg text-risk-low' : 'bg-slate-200 text-slate-500'}`}>
                  {hasLetters && hasNumbers ? <Check className="w-2.5 h-2.5" /> : '•'}
                </span>
                <span>Conter letras e números</span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${passwordsMatch ? 'bg-risk-low-bg text-risk-low' : 'bg-slate-200 text-slate-500'}`}>
                  {passwordsMatch ? <Check className="w-2.5 h-2.5" /> : '•'}
                </span>
                <span>Confirmação idêntica à nova senha</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-app-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isLoading}
              >
                Atualizar Senha
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
