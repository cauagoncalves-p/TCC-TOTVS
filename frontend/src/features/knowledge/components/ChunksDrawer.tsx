// frontend/src/features/knowledge/components/ChunksDrawer.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  RefreshCw,
  Search,
  BookOpen,
  Layers,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { KnowledgeDocument, KnowledgeChunk, DocumentChunksResponse } from '../types';
import { knowledgeApi } from '../api';

interface ChunksDrawerProps {
  document: KnowledgeDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onReindex?: (doc: KnowledgeDocument) => void;
}

const CHUNKS_PER_PAGE = 10;

export const ChunksDrawer: React.FC<ChunksDrawerProps> = ({
  document,
  isOpen,
  onClose,
  onReindex
}) => {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<DocumentChunksResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  const fetchChunks = useCallback(async () => {
    if (!document) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await knowledgeApi.getDocumentChunks(document.id, page, CHUNKS_PER_PAGE);
      setData(result);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erro ao carregar trechos.');
    } finally {
      setIsLoading(false);
    }
  }, [document, page]);

  useEffect(() => {
    if (isOpen && document) {
      setPage(1);
      setExpandedIds(new Set());
      setSearch('');
      setData(null);
    }
  }, [isOpen, document?.id]);

  useEffect(() => {
    if (isOpen && document) {
      fetchChunks();
    }
  }, [isOpen, page, document?.id]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredChunks = (data?.chunks || []).filter((c) =>
    search.trim() === '' ? true : c.content.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-[var(--z-drawer)] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-[var(--z-drawer)] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Trechos indexados"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2 mb-0.5">
              <Layers className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Trechos Indexados
              </span>
            </div>
            <h2 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
              {document?.title}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Versão {document?.version} •{' '}
              {data
                ? `${data.pagination.total} trechos no total`
                : 'Carregando...'}
              {document?.extractionMethod === 'ocr_ia' && (
                <span className="ml-1.5 text-blue-600 font-medium">(OCR IA)</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors shrink-0"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search + Reindex bar */}
        <div className="px-5 py-3 border-b border-slate-200 bg-white shrink-0 space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar por conteúdo..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {document && onReindex && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Método:{' '}
                <span className="font-medium text-slate-600">
                  {document.extractionMethod === 'ocr_ia' ? 'OCR por IA' : 'Extração de texto'}
                </span>
              </span>
              {document.indexStatus === 'falhou' && (
                <button
                  onClick={() => onReindex(document)}
                  className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-800 font-medium"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reindexar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">Carregando trechos...</span>
            </div>
          )}

          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
              <AlertTriangle className="w-8 h-8 text-rose-400" />
              <p className="text-xs text-slate-600 max-w-xs">{error}</p>
              <button
                onClick={fetchChunks}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {!isLoading && !error && filteredChunks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-center text-slate-400">
              <BookOpen className="w-8 h-8" />
              <p className="text-xs max-w-xs">
                {search
                  ? 'Nenhum trecho encontrado para este filtro.'
                  : 'Este documento não possui trechos indexados ainda.'}
              </p>
            </div>
          )}

          {!isLoading &&
            !error &&
            filteredChunks.map((chunk) => (
              <ChunkItem
                key={chunk.id}
                chunk={chunk}
                isExpanded={expandedIds.has(chunk.id)}
                onToggle={() => toggleExpand(chunk.id)}
              />
            ))}
        </div>

        {/* Pagination */}
        {data && data.pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50 shrink-0">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded-md hover:bg-slate-100"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Anterior
            </button>
            <span className="text-xs text-slate-500">
              Página {page} de {data.pagination.pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
              disabled={page >= data.pagination.pages || isLoading}
              className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded-md hover:bg-slate-100"
            >
              Próxima
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

// ---- Sub-componente: Chunk expandível ----
interface ChunkItemProps {
  chunk: KnowledgeChunk;
  isExpanded: boolean;
  onToggle: () => void;
}

const ChunkItem: React.FC<ChunkItemProps> = ({ chunk, isExpanded, onToggle }) => {
  const preview = chunk.content.slice(0, 120);
  const hasMore = chunk.content.length > 120;

  return (
    <div className="border border-slate-200 rounded-lg bg-white hover:border-blue-200 transition-colors">
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
            <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
              #{chunk.chunkIndex + 1}
            </span>
            {chunk.page && (
              <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                <FileText className="w-3 h-3" />
                p. {chunk.page}
              </span>
            )}
            {chunk.sectionRef && (
              <span className="text-[10px] text-slate-400 truncate max-w-[150px]" title={chunk.sectionRef}>
                {chunk.sectionRef}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-700 leading-relaxed">
            {isExpanded ? chunk.content : preview + (hasMore && !isExpanded ? '…' : '')}
          </p>
        </div>
      </button>
    </div>
  );
};
