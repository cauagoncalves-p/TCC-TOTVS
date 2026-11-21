// frontend/src/features/retention/components/NotConsideredBox.tsx
import React from 'react';
import { ShieldCheck, XCircle } from 'lucide-react';

export const NotConsideredBox: React.FC = () => {
  const excludedItems = [
    { title: 'Motivo de ausências e atestados', desc: 'Apenas a contagem de dias úteis; nenhuma informação de diagnóstico ou CID.' },
    { title: 'Dados de saúde e médicos', desc: 'Absolutamente nenhum histórico clínico, afastamento médico ou laudo.' },
    { title: 'Afastamentos legais protegidos', desc: 'Licença-maternidade, paternidade e luto são desconsiderados de penalizações.' },
    { title: 'Idade e data de nascimento', desc: 'Prevenção ativa contra qualquer viés etário (ageismo).' },
    { title: 'Gênero e características protegidas', desc: 'Gênero, raça, estado civil ou orientação não são coletados nem ponderados.' },
    { title: 'Salário e remuneração', desc: 'Apenas a data da última movimentação funcional é observada, nunca valores monetários.' },
    { title: 'Pesquisa de clima anônima', desc: 'O sigilo individual das pesquisas institucionais é 100% preservado.' }
  ];

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
      <div className="flex items-center gap-2 text-slate-800">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          O que NÃO é considerado no cálculo (Privacidade e Ética)
        </h4>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">
        Em conformidade com a LGPD e princípios de inteligência ética, o índice avalia estritamente indicadores operacionais agregados, excluindo qualquer dado sensível ou protegido:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        {excludedItems.map((item, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2 p-2 bg-white rounded-lg border border-slate-200/80 text-xs"
          >
            <XCircle className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <span className="font-semibold text-slate-800 block text-[11px]">{item.title}</span>
              <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">{item.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
