// frontend/src/features/knowledge/components/DocumentCard.tsx
import React from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Sparkles,
  Users,
  Eye,
  HelpCircle,
  CopyPlus,
  Archive,
  RefreshCw
} from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { cn } from '../../../lib/utils';
import { KnowledgeDocument } from '../types';
import {
  DOC_TYPE_LABELS,
  AUDIENCE_LABELS,
  calculateValidityStatus,
  VALIDITY_LABELS,
  formatDocumentSize,
  formatBrDate
} from '../utils';

export interface DocumentCardProps {
  document: KnowledgeDocument;
  userRole?: string;
  isHighlighted?: boolean;
  onViewChunks?: (doc: KnowledgeDocument) => void;
  onTestQuestion?: (doc: KnowledgeDocument) => void;
  onNewVersion?: (doc: KnowledgeDocument) => void;
  onArchiveToggle?: (doc: KnowledgeDocument) => void;
  onRetryUpload?: (doc: KnowledgeDocument) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  userRole = 'colaborador',
  isHighlighted = false,
  onViewChunks,
  onTestQuestion,
  onNewVersion,
  onArchiveToggle,
  onRetryUpload
}) => {
  const isRh = userRole === 'rh';
  const validity = calculateValidityStatus(document);

  return (
    <div
      className={cn(
        'p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between space-y-3 transition-all',
        isHighlighted && 'ring-2 ring-blue-500 shadow-md bg-blue-50/20'
      )}
    >
      <div className="space-y-2">
        {/* Topo: Tipo em maiúsculas à esquerda e Selo de Vigência à direita */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {DOC_TYPE_LABELS[document.docType] || document.docType}
          </span>
          {validity === 'vigente' ? (
            <Badge variant="success" className="text-[10px]">
              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
              Vigente
            </Badge>
          ) : (
            <Badge variant="neutral" className="text-[10px]">
              <Clock className="w-2.5 h-2.5 mr-0.5" />
              {VALIDITY_LABELS[validity]}
            </Badge>
          )}
        </div>

        {/* Título com ícone FileText azul */}
        <div className="flex items-start gap-2">
          <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2" title={document.title}>
            {document.title}
          </h4>
        </div>
      </div>

      {/* Grid de Metadados clássicos */}
      <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-100">
        <div className="flex justify-between">
          <span>Versão:</span>
          <span className="font-semibold text-slate-700">{document.version}</span>
        </div>
        <div className="flex justify-between">
          <span>Publicação:</span>
          <span>{formatBrDate(document.publishedAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>Vigência:</span>
          <span className="text-slate-700">
            {document.effectiveTo ? formatBrDate(document.effectiveTo) : 'Indeterminada'}
          </span>
        </div>
        <div className="flex justify-between text-slate-400 text-[10px]">
          <span>Tamanho:</span>
          <span>{formatDocumentSize(document)}</span>
        </div>
      </div>

      {/* Badges de Funcionalidade RAG (Indexação, Público, OCR) */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {document.indexStatus === 'indexado' && (
          <Badge variant="success" className="text-[10px]">
            <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
            Indexado, {document.chunkCount} trechos
          </Badge>
        )}

        {document.indexStatus === 'processando' && (
          <Badge variant="warning" className="text-[10px]">
            <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
            Processando...
          </Badge>
        )}

        {document.indexStatus === 'falhou' && (
          <div className="relative group inline-block">
            <Badge variant="danger" className="text-[10px]">
              <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
              Falhou
            </Badge>
            {document.indexError && (
              <div className="absolute z-[var(--z-tooltip)] bottom-full left-0 mb-1 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded shadow-lg">
                {document.indexError}
              </div>
            )}
          </div>
        )}

        <Badge variant="neutral" className="text-[10px]">
          <Users className="w-2.5 h-2.5 mr-0.5" />
          {AUDIENCE_LABELS[document.audience] || document.audience}
        </Badge>

        {document.extractionMethod === 'ocr_ia' && (
          <Badge variant="info" className="text-[10px]" title="Lido por OCR com IA">
            <Sparkles className="w-2.5 h-2.5 mr-0.5 text-blue-600" />
            OCR IA
          </Badge>
        )}
      </div>

      {/* Ações discretas no rodapé */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onViewChunks?.(document)}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="Ver o que a IA enxerga"
          >
            <Eye className="w-3.5 h-3.5" />
            Ver trechos
          </button>
          <button
            type="button"
            onClick={() => onTestQuestion?.(document)}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="Testar pergunta"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Testar pergunta
          </button>
        </div>

        {isRh && (
          <div className="flex items-center gap-1">
            {document.indexStatus === 'falhou' && (
              <button
                type="button"
                onClick={() => onRetryUpload?.(document)}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reenviar
              </button>
            )}

            {document.isCurrent && !document.isArchived && (
              <button
                type="button"
                onClick={() => onNewVersion?.(document)}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="Criar nova versão"
              >
                <CopyPlus className="w-3.5 h-3.5" />
                Nova versão
              </button>
            )}

            <button
              type="button"
              onClick={() => onArchiveToggle?.(document)}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              title={document.isArchived ? 'Desarquivar' : 'Arquivar'}
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
