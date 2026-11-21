// frontend/src/features/retention/pages/MethodologyPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Scale,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CalendarX,
  TrendingUp,
  Info
} from 'lucide-react';
import { useRetentionConfig } from '../hooks';
import { RestrictedNotice } from '../components/RestrictedNotice';
import { NotConsideredBox } from '../components/NotConsideredBox';

export const MethodologyPage: React.FC = () => {
  const { data: config, isLoading, isError } = useRetentionConfig();

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Botão de Retorno */}
      <div className="flex items-center justify-between">
        <Link
          to="/inteligencia/colaboradores"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-brand-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lista de Colaboradores</span>
        </Link>

        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
          Versão do Modelo: <strong>{config?.version || 'regras-v1'}</strong>
        </span>
      </div>

      {/* Título e Subtítulo */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <Sparkles className="w-6 h-6 text-brand-600" />
          Como o Índice de Atenção é Calculado
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Metodologia transparente, explicável e ética de apoio à retenção de talentos e cuidado com as equipes de trabalho.
        </p>
      </div>

      {/* Aviso Fixo de Restrição Obrigatório */}
      <RestrictedNotice />

      {/* Resumo e Filosofia do Modelo */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
          <Info className="w-4 h-4 text-brand-600" />
          Objetivo e Premissas do Modelo
        </h2>
        <p className="text-xs text-slate-700 leading-relaxed">
          {config?.description ||
            'O modelo de regras-v1 é uma metodologia determinística e explicável, baseada em médias móveis trimestrais comparadas com a mediana do departamento de cada colaborador. Seu objetivo é apoiar o RH na identificação proativa de sobrecarga e estagnação, permitindo conversas de cuidado e planos de retenção antes de decisões extremas.'}
        </p>
        <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Indicador de apoio — Não é previsão de desligamento:</strong> O índice pontua indicadores de desgaste operacional relativo. Ele não prevê demissões, não avalia a qualidade do trabalho individual e nunca deve ser utilizado para fins disciplinares ou punitivos.
          </div>
        </div>
      </div>

      {/* Tabela de Componentes e Pesos (100 Pontos) */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
          <Scale className="w-4 h-4 text-brand-600" />
          Componentes da Pontuação (Total: 100 pontos)
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                <th className="py-2.5 px-3">Componente</th>
                <th className="py-2.5 px-3">Peso Máximo</th>
                <th className="py-2.5 px-3">Janela de Análise</th>
                <th className="py-2.5 px-3">Critério de Ponderação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  Sobrecarga de Trabalho
                </td>
                <td className="py-3 px-3 font-mono font-bold text-slate-900">40 pontos</td>
                <td className="py-3 px-3 text-slate-600">Últimos 3 meses</td>
                <td className="py-3 px-3 text-slate-600">
                  Média de horas extras mensais do colaborador dividida pela mediana do departamento (ratio).
                  Razões &gt; 2.5x recebem pontuação integral (40 pts); razões &gt; 1.5x recebem 25 pts.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                  <CalendarX className="w-4 h-4 text-rose-500 shrink-0" />
                  Ausências e Faltas
                </td>
                <td className="py-3 px-3 font-mono font-bold text-slate-900">40 pontos</td>
                <td className="py-3 px-3 text-slate-600">Últimos 3 meses vs 3 meses anteriores</td>
                <td className="py-3 px-3 text-slate-600">
                  Nível de ausências em relação ao setor (até 25 pts) somado ao crescimento trimestral das faltas (até 15 pts).
                  Sem avaliar diagnósticos ou causas.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500 shrink-0" />
                  Estagnação Funcional
                </td>
                <td className="py-3 px-3 font-mono font-bold text-slate-900">20 pontos</td>
                <td className="py-3 px-3 text-slate-600">Histórico de Carreira</td>
                <td className="py-3 px-3 text-slate-600">
                  Tempo decorrido desde a admissão ou última movimentação/promoção funcional (&gt; 12 meses pontua gradualmente até 30 meses = 20 pts).
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Faixas e Níveis de Atenção */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">Atenção Baixa</span>
            <span className="text-xs font-mono font-bold text-emerald-800">&lt; 35 pontos</span>
          </div>
          <p className="text-xs text-emerald-800 leading-relaxed">
            Indicadores alinhados à média das equipes. Baixa oscilação de faltas ou horas extras.
          </p>
        </div>

        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">Atenção Moderada</span>
            <span className="text-xs font-mono font-bold text-amber-800">35 a 64 pontos</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Ponto de atenção preventiva. Recomenda-se acompanhamento de rotina ou conversa 1:1 de alinhamento.
          </p>
        </div>

        <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-900">Atenção Alta</span>
            <span className="text-xs font-mono font-bold text-rose-800">&ge; 65 pontos</span>
          </div>
          <p className="text-xs text-rose-800 leading-relaxed">
            Sinais múltiplos de sobrecarga contínua ou aumento sensível de faltas. Prioridade de escuta pelo RH.
          </p>
        </div>
      </div>

      {/* Regras Especiais: Dados Insuficientes e Não Aplicável */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          Critérios de Elegibilidade e Exceção
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <strong className="text-slate-900 block font-bold">Dados Insuficientes:</strong>
            <p className="text-slate-600 leading-relaxed">
              Atribuído a colaboradores com menos de 90 dias de casa ou com menos de 3 meses de histórico válido no ponto eletrônico. Nenhuma barra numérica é exibida.
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <strong className="text-slate-900 block font-bold">Não Aplicável:</strong>
            <p className="text-slate-600 leading-relaxed">
              Atribuído a aprendizes, estagiários e categorias sob contratos especiais onde os critérios de horas extras ou metas de retenção não se aplicam legalmente.
            </p>
          </div>
        </div>
      </div>

      {/* Caixa do que NÃO é considerado (Privacidade e LGPD) */}
      <NotConsideredBox />

      {/* Limitações Metodológicas do Modelo */}
      <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs text-slate-600">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
          Limitações Metodológicas Conhecidas
        </h3>
        <ul className="list-disc pl-5 space-y-1 leading-relaxed">
          <li>O modelo é determinístico (regras lineares explicáveis) e não utiliza redes neurais ou caixas-pretas estatísticas.</li>
          <li>A precisão das conclusões depende diretamente da correta marcação do ponto eletrônico e do registro de movimentações no sistema de folha.</li>
          <li>Variações sazonais do negócio (como fechamento de mês fiscal ou plantões) podem elevar temporariamente o índice sem representar risco real. O julgamento humano do RH é sempre indispensável.</li>
        </ul>
      </div>
    </div>
  );
};
