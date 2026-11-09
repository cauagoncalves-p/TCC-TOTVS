import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { authService } from '../../services/authService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      await authService.login(email.trim(), password);
      navigate(from, { replace: true });
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 mb-3">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">TOTVS RH Inteligente</h1>
          <p className="text-xs text-slate-400 mt-1">
            Plataforma de Gestão, Inteligência Preditiva e Compliance com IA
          </p>
        </div>

        {/* Card de Login */}
        <Card className="p-7 bg-white/95 backdrop-blur shadow-2xl border border-slate-200">
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
              <div className="p-3 text-xs bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 shadow-md shadow-blue-600/20"
              isLoading={isLoading}
            >
              <span>Acessar Plataforma</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          {/* Atalhos para a Demonstração (Demo) */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block text-center mb-2.5">
              Acesso Rápido para Demonstração (Demo)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('ana.souza@exemplo.com')}
                className="p-2 text-center rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-left"
              >
                <span className="block text-[11px] font-bold text-slate-800">Ana Souza</span>
                <span className="block text-[9px] text-slate-500 font-medium">Colaborador</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('roberta.rh@exemplo.com')}
                className="p-2 text-center rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-left"
              >
                <span className="block text-[11px] font-bold text-slate-800">Roberta RH</span>
                <span className="block text-[9px] text-blue-600 font-semibold">Perfil RH</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('carlos.gestor@exemplo.com')}
                className="p-2 text-center rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-left"
              >
                <span className="block text-[11px] font-bold text-slate-800">Carlos</span>
                <span className="block text-[9px] text-amber-600 font-semibold">Perfil Gestor</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-2.5">
              Senha padrão do ambiente de demonstração: <code className="font-semibold text-slate-600">123456</code>
            </p>
          </div>
        </Card>

        {/* Rodapé institucional */}
        <p className="text-center text-xs text-slate-500 mt-6 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Ambiente protegido com autenticação JWT e RBAC</span>
        </p>
      </div>
    </div>
  );
};
