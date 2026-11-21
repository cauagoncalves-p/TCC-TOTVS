// frontend/src/features/retention/components/FollowUpForm.tsx
import React, { useState } from 'react';
import { useAddFollowUp } from '../hooks';
import { FollowUpActionType } from '../types';
import { FOLLOW_UP_ACTION_LABELS } from '../labels';
import { Lightbulb, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface FollowUpFormProps {
  employeeId: number;
  onSuccess?: () => void;
}

export const FollowUpForm: React.FC<FollowUpFormProps> = ({ employeeId, onSuccess }) => {
  const [actionType, setActionType] = useState<FollowUpActionType>('conversa_1_1');
  const [note, setNote] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addFollowUpMutation = useAddFollowUp(employeeId);

  const maxChars = 500;
  const remainingChars = maxChars - note.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setErrorMsg('Por favor, informe uma breve nota sobre a ação planejada ou realizada.');
      return;
    }

    setErrorMsg(null);

    try {
      await addFollowUpMutation.mutateAsync({
        actionType,
        note: note.trim()
      });

      setNote('');
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 4000);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Erro ao registrar ação de acompanhamento. Tente novamente.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Sugestões de Apoio e Boas Práticas (Apenas texto orientador) */}
      <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1.5 text-xs text-amber-900">
        <div className="flex items-center gap-1.5 font-bold text-amber-950">
          <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
          <span>Sugestões de Apoio e Ações Recomendadas</span>
        </div>
        <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-800 leading-normal">
          <li><strong>Conversa individual (1:1):</strong> Abordagem empática para entender o momento e desafios do colaborador.</li>
          <li><strong>Revisão de carga:</strong> Avaliar distribuição de entregas, horas extras frequentes e apoio entre pares.</li>
          <li><strong>Desenvolvimento e carreira:</strong> Alinhar expectativas funcionais, novos desafios ou Plano de Desenvolvimento Individual (PDI).</li>
        </ul>
      </div>

      {/* Formulário de Registro */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border border-slate-200 rounded-xl space-y-3.5 shadow-2xs">
        <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
          Registrar Nova Ação de Acompanhamento
        </h5>

        {/* Tipo de Ação */}
        <div>
          <label htmlFor="followup-action-type" className="block text-xs font-semibold text-slate-700 mb-1">
            Tipo de Ação:
          </label>
          <select
            id="followup-action-type"
            value={actionType}
            onChange={(e) => setActionType(e.target.value as FollowUpActionType)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {Object.entries(FOLLOW_UP_ACTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Nota / Detalhamento */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="followup-note" className="block text-xs font-semibold text-slate-700">
              Observações / Plano de Ação:
            </label>
            <span
              className={cn(
                'text-[11px] font-mono',
                remainingChars < 50 ? 'text-rose-600 font-bold' : 'text-slate-400'
              )}
            >
              {remainingChars} caracteres restantes
            </span>
          </div>

          <textarea
            id="followup-note"
            rows={3}
            maxLength={maxChars}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: Realizada conversa 1:1 para alinhamento de prioridades. Combinado acompanhamento quinzenal..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />

          {/* Aviso Fixo de Privacidade Obrigatório */}
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-amber-700 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" aria-hidden="true" />
            <span>Atenção: Não registre dados de saúde nem motivo de ausências nesta nota.</span>
          </div>
        </div>

        {/* Mensagens de Sucesso ou Erro */}
        {successMsg && (
          <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Ação de acompanhamento registrada com sucesso no histórico.</span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Botão de Envio */}
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={addFollowUpMutation.isPending || !note.trim()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{addFollowUpMutation.isPending ? 'Salvando...' : 'Salvar Acompanhamento'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
