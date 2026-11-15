import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Lock, ArrowRight, ShieldCheck, Accessibility } from 'lucide-react';
import { authService } from '../../services/authService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { AccessibilityPanel } from '../../features/accessibility/components/AccessibilityPanel';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isA11yOpen, setIsA11yOpen] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, informe e-mail e senha.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const session = await authService.login(email.trim(), password);
      if (session.mustChangePassword) {
        navigate('/force-change-password', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Falha ao autenticar. Verifique suas credenciais.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('123456');
  };

  return (
    <div className="min-h-screen bg-brand-950 flex flex-col justify-center items-center p-4 relative">
      {/* Botão de Acessibilidade no Login */}
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={() => setIsA11yOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-900/80 hover:bg-brand-700 text-slate-300 hover:text-white border border-brand-700 text-xs font-medium transition-colors shadow-xs"
          title="Opções de Acessibilidade (VLibras)"
          aria-label="Abrir painel de acessibilidade"
        >
          <Accessibility className="w-4 h-4 text-accent-cyan" />
          <span>Acessibilidade</span>
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/20 mb-3">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">TOTVS RH Inteligente</h1>
          <p className="text-xs text-slate-300 mt-1">
            Plataforma de Gestão, Inteligência Preditiva e Compliance com IA
          </p>
        </div>

        {/* Card de Login */}
        <Card className="p-7 bg-app-surface shadow-2xl border border-app-border">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="E-mail corporativo"
                type="email"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                disabled={isLoading}
              />
            </div>

            <div>
              <Input
                label="Senha de acesso"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="p-3 text-xs bg-risk-high-bg border border-risk-high/30 rounded-lg text-risk-high flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 text-risk-high" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 shadow-md shadow-brand-500/20"
              isLoading={isLoading}
            >
              <span>Acessar Plataforma</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          {/* Atalhos para a Demonstração (Demo) */}
          <div className="mt-6 pt-5 border-t border-app-border">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary block text-center mb-2.5">
              Acesso Rápido para Demonstração (Demo)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('ana.souza@exemplo.com')}
                className="p-2 text-center rounded-lg border border-app-border hover:border-brand-500 hover:bg-brand-100/50 transition-colors text-left"
              >
                <span className="block text-[11px] font-bold text-text-primary">Ana Souza</span>
                <span className="block text-[9px] text-text-secondary font-medium">Colaborador</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('roberta.rh@exemplo.com')}
                className="p-2 text-center rounded-lg border border-app-border hover:border-brand-500 hover:bg-brand-100/50 transition-colors text-left"
              >
                <span className="block text-[11px] font-bold text-text-primary">Roberta RH</span>
                <span className="block text-[9px] text-brand-500 font-semibold">Perfil RH</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('carlos.gestor@exemplo.com')}
                className="p-2 text-center rounded-lg border border-app-border hover:border-brand-500 hover:bg-brand-100/50 transition-colors text-left"
              >
                <span className="block text-[11px] font-bold text-text-primary">Carlos</span>
                <span className="block text-[9px] text-risk-moderate font-semibold">Perfil Gestor</span>
              </button>
            </div>
            <p className="text-[10px] text-text-secondary/80 text-center mt-2.5">
              Senha padrão do ambiente de demonstração: <code className="font-semibold text-text-primary">123456</code>
            </p>
          </div>
        </Card>

        {/* Rodapé institucional */}
        <p className="text-center text-xs text-slate-400 mt-6 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-brand-500" />
          <span>Acesso corporativo seguro • TOTVS RH Inteligente</span>
        </p>
      </div>

      {/* Painel de Acessibilidade */}
      <AccessibilityPanel
        isOpen={isA11yOpen}
        onClose={() => setIsA11yOpen(false)}
      />
    </div>
  );
};
