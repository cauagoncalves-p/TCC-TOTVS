// frontend/src/pages/auth/ForceChangePasswordPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldAlert, Check, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { authService } from '../../services/authService';

export const ForceChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const user = authService.getUser();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Validações em tempo real
  const hasMinLength = newPassword.length >= 8;
  const hasLetters = /[a-zA-Z]/.test(newPassword);
  const hasNumbers = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError('Por favor, informe a senha atual ou temporária recebida.');
      return;
    }

    if (!hasMinLength || !hasLetters || !hasNumbers) {
      setError('A nova senha deve ter no mínimo 8 caracteres e conter letras e números.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação da nova senha não coincide.');
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
        navigate('/', { replace: true });
      }, 1500);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Erro ao definir nova senha.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/20 mb-3">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Troca de Senha Obrigatória
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            Por conformidade e segurança da conta, você precisa cadastrar uma nova senha pessoal antes de continuar.
          </p>
        </div>

        <Card className="p-7 bg-app-surface shadow-2xl border border-app-border space-y-5">
          {user?.email && (
            <div className="bg-app-bg rounded-xl p-3 border border-app-border text-xs flex items-center justify-between">
              <span className="text-text-secondary">Conta conectada:</span>
              <span className="font-semibold text-brand-900">{user.email}</span>
            </div>
          )}

          {success ? (
            <div className="p-5 rounded-xl bg-risk-low-bg border border-risk-low/40 text-risk-low flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 className="w-8 h-8 shrink-0 text-risk-low" />
              <div className="text-xs">
                <span className="font-bold text-sm block">Senha redefinida com sucesso!</span>
                <span className="text-risk-low/90">Acesso liberado. Redirecionando para o painel principal...</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {error && (
                <div className="p-3 text-xs bg-risk-high-bg border border-risk-high/30 rounded-lg text-risk-high flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0 text-risk-high" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <Input
                  label="Senha Temporária ou Atual"
                  type="password"
                  placeholder="Informe a senha que utilizou para entrar"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                  required
                />
              </div>

              <div>
                <Input
                  label="Nova Senha Pessoal"
                  type="password"
                  placeholder="Mínimo 8 caracteres (letras e números)"
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
                  placeholder="Digite novamente a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Checklist de requisitos de segurança */}
              <div className="p-3 rounded-xl bg-app-bg border border-app-border space-y-1.5 text-[11px]">
                <span className="font-semibold text-text-primary block mb-1">Requisitos obrigatórios:</span>
                <div className="flex items-center gap-2 text-text-secondary">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${hasMinLength ? 'bg-risk-low-bg text-risk-low' : 'bg-slate-200 text-slate-500'}`}>
                    {hasMinLength ? <Check className="w-2.5 h-2.5" /> : '•'}
                  </span>
                  <span>Mínimo de 8 caracteres</span>
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${hasLetters && hasNumbers ? 'bg-risk-low-bg text-risk-low' : 'bg-slate-200 text-slate-500'}`}>
                    {hasLetters && hasNumbers ? <Check className="w-2.5 h-2.5" /> : '•'}
                  </span>
                  <span>Conter ao menos letras e números</span>
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${passwordsMatch ? 'bg-risk-low-bg text-risk-low' : 'bg-slate-200 text-slate-500'}`}>
                    {passwordsMatch ? <Check className="w-2.5 h-2.5" /> : '•'}
                  </span>
                  <span>Confirmação da nova senha idêntica</span>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full py-2.5 shadow-md shadow-brand-500/20"
                isLoading={isLoading}
              >
                <span>Definir Nova Senha e Acessar</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};
