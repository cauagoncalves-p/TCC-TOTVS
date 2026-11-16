// frontend/src/features/knowledge/components/StructureSuggestionDialog.tsx
import React from 'react';
import { X, Sparkles, AlertTriangle, ArrowRight, Check } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface StructureSuggestionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  suggestedMarkdown: string;
  onApply: (newText: string) => void;
}

export const StructureSuggestionDialog: React.FC<StructureSuggestionDialogProps> = ({
  isOpen,
  onClose,
  originalText,
  suggestedMarkdown,
  onApply
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                Sugestão de Estrutura em Perguntas e Respostas
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                A IA reorganizou o texto para otimizar a recuperação semântica pelo RAG
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Faixa Obrigatória de Aviso */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-amber-50 border-b border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold">Aviso de Conformidade:</span> Esta é apenas uma
            sugestão de organização textual. A IA não deve inventar prazos, regras ou exceções.
            Revise cuidadosamente todos os artigos antes de salvar ou publicar a política.
          </div>
        </div>

        {/* Comparativo de Duas Colunas */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Coluna 1: Texto Original */}
          <div className="flex flex-col border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
            <div className="px-3.5 py-2 border-b border-slate-200 bg-slate-100 text-xs font-semibold text-slate-700">
              Texto Original
            </div>
            <div className="p-3.5 text-xs text-slate-700 whitespace-pre-wrap font-mono overflow-y-auto max-h-[45vh] leading-relaxed">
              {originalText}
            </div>
          </div>

          {/* Coluna 2: Sugestão da IA */}
          <div className="flex flex-col border border-blue-200 rounded-lg overflow-hidden bg-blue-50/20">
            <div className="px-3.5 py-2 border-b border-blue-200 bg-blue-50 text-xs font-semibold text-blue-900 flex items-center justify-between">
              <span>Sugestão Reorganizada (Markdown)</span>
              <span className="text-[10px] bg-blue-200/70 text-blue-800 px-1.5 py-0.5 rounded font-medium">
                Otimizado para RAG
              </span>
            </div>
            <div className="p-3.5 text-xs text-slate-800 whitespace-pre-wrap font-mono overflow-y-auto max-h-[45vh] leading-relaxed">
              {suggestedMarkdown}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 sm:gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Descartar Sugestão
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onApply(suggestedMarkdown);
              onClose();
            }}
            className="text-xs font-semibold"
          >
            <Check className="w-4 h-4 mr-1.5" />
            Aplicar no Editor
          </Button>
        </div>
      </div>
    </div>
  );
};
