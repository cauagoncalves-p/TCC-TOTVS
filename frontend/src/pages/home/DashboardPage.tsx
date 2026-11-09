import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  User,
  UserPlus,
  TrendingUp,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { authService } from '../../services/authService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = authService.getUser();
  const role = user?.role || 'colaborador';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-blue-100 text-xs font-medium mb-3 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            <span>TOTVS RH Inteligente • Ambiente Integrado</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Olá, bem-vindo(a) ao portal!
          </h1>
          <p className="text-sm text-blue-100/90 mt-1 leading-relaxed">
            Você está conectado como <span className="font-semibold text-white capitalize">{role}</span>. Selecione um dos módulos disponíveis abaixo ou navegue pelo menu lateral para iniciar suas atividades.
          </p>
        </div>
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* Role specific quick action cards */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Módulos Habilitados para seu Perfil
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {role === 'colaborador' && (
            <>
              <Card className="p-5 flex flex-col justify-between hover:border-blue-300 transition-all">
                <div>
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 w-fit mb-3">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">Assistente Virtual de RH</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Tire dúvidas em linguagem natural sobre políticas, holerites, benefícios e saldo de férias com IA generativa.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/chat')} className="w-full justify-between">
                  <span>Abrir Assistente</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Card>

              <Card className="p-5 flex flex-col justify-between hover:border-blue-300 transition-all">
                <div>
                  <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 w-fit mb-3">
                    <User className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">Meu Perfil Cadastral</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Consulte seus dados funcionais, cargo, departamento e data de admissão registrados no sistema.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/me')} className="w-full justify-between">
                  <span>Ver Meu Perfil</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Card>
            </>
          )}

          {role === 'rh' && (
            <>
              <Card className="p-5 flex flex-col justify-between hover:border-blue-300 transition-all">
                <div>
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 w-fit mb-3">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">Onboarding com Extração por IA</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Envie fichas de admissão em PDF, revise os dados extraídos pelo Gemini e aprove o cadastro com geração automática de matrícula.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/onboarding')} className="w-full justify-between">
                  <span>Acessar Onboarding</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Card>

              <Card className="p-5 flex flex-col justify-between hover:border-blue-300 transition-all">
                <div>
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 w-fit mb-3">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">Inteligência Preditiva</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Monitore absenteísmo, horas extras e turnover, cruze regras de risco e antecipe gargalos de gestão de pessoas.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/analytics')} className="w-full justify-between">
                  <span>Ver Indicadores</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Card>

              <Card className="p-5 flex flex-col justify-between hover:border-blue-300 transition-all">
                <div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 w-fit mb-3">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">Compliance Inteligente</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Auditoria preventiva de inconsistências cadastrais e pré-validação de eventos eSocial (S-2200, S-2230, S-2299).
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/compliance')} className="w-full justify-between">
                  <span>Central de Compliance</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Card>
            </>
          )}

          {role === 'gestor' && (
            <>
              <Card className="p-5 flex flex-col justify-between hover:border-blue-300 transition-all">
                <div>
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 w-fit mb-3">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">Painel de Inteligência</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Visão consolidada de indicadores gerenciais, séries temporais e alertas ativos por departamento.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/analytics')} className="w-full justify-between">
                  <span>Acessar Painel</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Card>

              <Card className="p-5 flex flex-col justify-between hover:border-blue-300 transition-all">
                <div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 w-fit mb-3">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">Visão de Conformidade</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Acompanhe as regras de integridade e a central de pendências dos colaboradores em modo de leitura.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/compliance')} className="w-full justify-between">
                  <span>Ver Conformidade</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
