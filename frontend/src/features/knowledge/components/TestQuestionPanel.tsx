// frontend/src/features/knowledge/components/TestQuestionPanel.tsx
import React, { useState, useRef } from 'react';
import {
  X,
  HelpCircle,
  Send,
  Loader2,
  BookOpen,
  FileText,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  History,
  Sparkles
} from 'lucide-react';
import { KnowledgeDocument, TestQuestionResponse, TestQuestionChunk } from '../types';
import { knowledgeApi } from '../api';
import { DOC_TYPE_LABELS } from '../utils';

interface TestQuestionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialDocument?: KnowledgeDocument | null;
}

type ScopeOption = 'rh' | 'colaborador' | 'todos';

interface HistoryEntry {
  id: number;
  question: string;
  scope: ScopeOption;
  result: TestQuestionResponse;
}

export const TestQuestionPanel: React.FC<TestQuestionPanelProps> = ({
  isOpen,
  onClose,
  initialDocument
}) => {
  const [question, setQuestion] = useState('');
  const [scope, setScope] = useState<ScopeOption>('rh');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TestQuestionResponse | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyCounter = useRef(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setExpandedChunks(new Set());

    try {
      const res = await knowledgeApi.testQuestion({ question: question.trim(), audienceScope: scope });
      setResult(res);
      historyCounter.current += 1;
      setHistory((prev) =>
        [{ id: historyCounter.current, question: question.trim(), scope, result: res }, ...prev].slice(0, 5)
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erro ao testar pergunta.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    setQuestion(entry.question);
    setScope(entry.scope);
    setResult(entry.result);
    setError(null);
    setExpandedChunks(new Set());
    setShowHistory(false);
  };

  const toggleChunk = (id: number) => {
    setExpandedChunks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Testar pergunta na base de conhecimento"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Testar Pergunta na IA</h2>
              <p className="text-xs text-slate-500">
                Simule como a IA responderia com os documentos indexados
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {history.length > 0 && (
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="inline-flex items-center gap-1 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
                title="Histórico de perguntas"
              >
                <History className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* History dropdown */}
        {showHistory && history.length > 0 && (
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Últimas {history.length} perguntas
            </p>
            <div className="space-y-1">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => loadFromHistory(entry)}
                  className="w-full text-left text-xs text-slate-700 px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 truncate transition-colors"
                  title={entry.question}
                >
                  <span className="font-medium mr-1 text-slate-400 uppercase text-[10px]">
                    [{entry.scope}]
                  </span>
                  {entry.question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 border-b border-slate-200 bg-white shrink-0 space-y-3">
          {initialDocument && (
            <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="line-clamp-1">
                Referência: <strong>{initialDocument.title}</strong> (v{initialDocument.version})
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Sua pergunta <span className="text-rose-500">*</span>
            </label>
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, 500))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleSubmit(e as any);
                }
              }}
              placeholder="Ex.: Quantos dias de férias um funcionário com 15 anos de empresa tem direito?"
              className="w-full min-h-[80px] px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={500}
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-slate-400">Ctrl+Enter para enviar</span>
              <span className={`text-[10px] ${question.length > 480 ? 'text-rose-500' : 'text-slate-400'}`}>
                {question.length}/500
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Escopo de busca
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as ScopeOption)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="rh">Somente RH (documentos restritos)</option>
                <option value="colaborador">Colaborador (documentos públicos)</option>
                <option value="todos">Todos os documentos</option>
              </select>
            </div>
            <div className="pt-5">
              <button
                type="submit"
                disabled={!question.trim() || isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {isLoading ? 'Consultando...' : 'Consultar IA'}
              </button>
            </div>
          </div>
        </form>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {!result && !error && !isLoading && (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-center text-slate-400">
              <Sparkles className="w-10 h-10 text-blue-200" />
              <p className="text-xs max-w-xs">
                Digite uma pergunta e clique em <strong>"Consultar IA"</strong> para ver como a base
                de conhecimento indexada responde.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-xs">Consultando base de conhecimento...</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-rose-700">Erro na consulta</p>
                <p className="text-xs text-rose-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {result && !isLoading && (
            <>
              {/* Resposta da IA */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-semibold text-slate-700">Resposta da IA</span>
                  {result.unconfirmed && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">
                      ⚠ Baixa confiança
                    </span>
                  )}
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {result.reply}
                </div>
              </div>

              {/* Fontes */}
              {result.sources.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    Fontes utilizadas ({result.sources.length})
                  </p>
                  <div className="space-y-1.5">
                    {result.sources.map((src, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                src.docType === 'politica_interna'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {src.docType === 'politica_interna'
                                ? '🏢 Política interna'
                                : `📄 ${DOC_TYPE_LABELS[src.docType as keyof typeof DOC_TYPE_LABELS] || src.docType}`}
                            </span>
                            {src.score !== undefined && (
                              <span className="text-[10px] text-slate-400">
                                Score: {(src.score * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-slate-800 mt-0.5 line-clamp-1">
                            {src.title}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            v{src.version}
                            {src.section && ` • ${src.section}`}
                            {src.page && ` • p. ${src.page}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trechos recuperados */}
              {result.chunks.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    Trechos recuperados pelo RAG ({result.chunks.length})
                  </p>
                  <div className="space-y-2">
                    {result.chunks.map((chunk) => (
                      <ChunkResultItem
                        key={chunk.id}
                        chunk={chunk}
                        isExpanded={expandedChunks.has(chunk.id)}
                        onToggle={() => toggleChunk(chunk.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {result.sources.length === 0 && result.chunks.length === 0 && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Nenhuma fonte foi encontrada na base de conhecimento para esta pergunta. A resposta pode
                    não ser baseada em documentos indexados.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

// ---- Sub-componente: Chunk da resposta ----
interface ChunkResultItemProps {
  chunk: TestQuestionChunk;
  isExpanded: boolean;
  onToggle: () => void;
}

const ChunkResultItem: React.FC<ChunkResultItemProps> = ({ chunk, isExpanded, onToggle }) => {
  const scoreColor =
    chunk.score >= 0.7
      ? 'text-green-700 bg-green-100'
      : chunk.score >= 0.4
      ? 'text-amber-700 bg-amber-100'
      : 'text-slate-600 bg-slate-100';

  const preview = chunk.content.slice(0, 150);

  return (
    <div className="border border-slate-200 rounded-lg bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left"
      >
        <span className="shrink-0 mt-0.5 text-blue-600">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${scoreColor}`}>
              {(chunk.score * 100).toFixed(0)}% relevância
            </span>
            <span className="text-[10px] text-slate-500 font-medium line-clamp-1 max-w-[200px]" title={chunk.title}>
              {chunk.title}
            </span>
            {chunk.page && (
              <span className="text-[10px] text-slate-400">p. {chunk.page}</span>
            )}
          </div>
          <p className="text-[11px] text-slate-700 leading-relaxed">
            {isExpanded ? chunk.content : preview + (chunk.content.length > 150 ? '…' : '')}
          </p>
        </div>
      </button>
    </div>
  );
};
