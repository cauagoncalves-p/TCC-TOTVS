// frontend/src/pages/knowledge/KnowledgePage.tsx
import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  RefreshCw,
  HelpCircle,
  FilePlus,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { authService } from '../../services/authService';
import { useKnowledgeDocuments } from '../../features/knowledge/hooks';
import { DocumentCard } from '../../features/knowledge/components/DocumentCard';
import { UploadDocumentDialog } from '../../features/knowledge/components/UploadDocumentDialog';
import { ChunksDrawer } from '../../features/knowledge/components/ChunksDrawer';
import { TestQuestionPanel } from '../../features/knowledge/components/TestQuestionPanel';
import { DocumentFiltersState, KnowledgeDocument, DocType } from '../../features/knowledge/types';
import { DOC_TYPE_LABELS, AUDIENCE_LABELS } from '../../features/knowledge/utils';

export const KnowledgePage: React.FC = () => {
  const currentUser = authService.getUser();
  const userRole = currentUser?.role || 'colaborador';
  const isRh = userRole === 'rh';

  // Estados dos filtros
  const [filters, setFilters] = useState<DocumentFiltersState>({
    type: '',
    situation: 'vigentes',
    audience: '',
    search: ''
  });

  const [searchInput, setSearchInput] = useState('');

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Hook da Base de Conhecimento (100% API, sem mocks)
  const { documents, isLoading, error, refetch, summary } = useKnowledgeDocuments(filters);

  // Estados de controle de modais
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadPrefillTitle, setUploadPrefillTitle] = useState('');
  const [uploadPrefillType, setUploadPrefillType] = useState<DocType>('politica_interna');
  const [highlightedDocId, setHighlightedDocId] = useState<number | null>(null);

  // ChunksDrawer
  const [chunksDoc, setChunksDoc] = useState<KnowledgeDocument | null>(null);
  const [isChunksOpen, setIsChunksOpen] = useState(false);

  // TestQuestionPanel
  const [testDoc, setTestDoc] = useState<KnowledgeDocument | null>(null);
  const [isTestOpen, setIsTestOpen] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenNewUpload = () => {
    setUploadPrefillTitle('');
    setUploadPrefillType('politica_interna');
    setIsUploadOpen(true);
  };

  const handleNewVersion = (doc: KnowledgeDocument) => {
    setUploadPrefillTitle(doc.title);
    setUploadPrefillType(doc.docType);
    setIsUploadOpen(true);
  };

  const handleUploadSuccess = (newDocId: number) => {
    setHighlightedDocId(newDocId);
    refetch();
    showToast('Documento oficial enviado e indexado com sucesso!');

    // Remove o destaque após 5 segundos
    setTimeout(() => {
      setHighlightedDocId(null);
    }, 5000);
  };

  const handleViewChunks = (doc: KnowledgeDocument) => {
    setChunksDoc(doc);
    setIsChunksOpen(true);
  };

  const handleTestQuestion = (doc?: KnowledgeDocument) => {
    setTestDoc(doc || null);
    setIsTestOpen(true);
  };

  const handleNewPolicy = () => {
    showToast('O editor de criação de políticas em Markdown será aberto na Fase C.');
  };

  return (
    <div className="space-y-6">
      {/* Toast flutuante de notificação */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-brand-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Base de Conhecimento Trabalhista
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Repositório central de políticas internas, convenções e normas oficiais indexadas para suporte à IA.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTestQuestion()}
            className="text-xs font-medium"
          >
            <HelpCircle className="w-4 h-4 mr-1.5 text-brand-600" />
            Testar pergunta
          </Button>

          {isRh && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewPolicy}
                className="text-xs font-medium"
              >
                <FilePlus className="w-4 h-4 mr-1.5 text-brand-600" />
                Nova política
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenNewUpload}
                className="text-xs font-medium shadow-xs"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Adicionar Documento Oficial
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-app-card border border-app-border rounded-xl p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Campo de Busca com Ícone */}
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por título, versão ou arquivo..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-app-card border border-app-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Filtro de Tipo */}
          <div>
            <select
              value={filters.type}
              onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 text-xs bg-app-card border border-app-border rounded-lg text-text-primary focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Todos os tipos de documentos</option>
              {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Situação */}
          <div>
            <select
              value={filters.situation}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  situation: e.target.value as DocumentFiltersState['situation']
                }))
              }
              className="w-full px-3 py-2 text-xs bg-app-card border border-app-border rounded-lg text-text-primary focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            >
              <option value="vigentes">Vigentes (Ativos na IA)</option>
              <option value="historicas">Históricas (Versões anteriores)</option>
              <option value="arquivadas">Arquivadas</option>
              <option value="todas">Todas as situações</option>
            </select>
          </div>

          {/* Filtro de Público */}
          <div>
            <select
              value={filters.audience}
              onChange={(e) => setFilters((prev) => ({ ...prev, audience: e.target.value }))}
              className="w-full px-3 py-2 text-xs bg-app-card border border-app-border rounded-lg text-text-primary focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Todos os públicos</option>
              {Object.entries(AUDIENCE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Linha de Resumo Dinâmico da Base */}
        <div className="flex items-center justify-between pt-2 border-t border-app-border text-xs text-text-secondary flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span>
              <strong>{summary.total}</strong> documentos encontrados
            </span>
            <span>•</span>
            <span className="text-risk-low font-medium">
              {summary.indexados} indexados
            </span>
            {summary.processando > 0 && (
              <>
                <span>•</span>
                <span className="text-risk-moderate font-medium animate-pulse">
                  {summary.processando} processando...
                </span>
              </>
            )}
            {summary.falhou > 0 && (
              <>
                <span>•</span>
                <span className="text-risk-high font-medium">
                  {summary.falhou} com falha
                </span>
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="text-xs h-7 text-text-muted hover:text-text-primary"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Conteúdo Principal: Esqueleto / Erro / Vazio / Grade de Cartões */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 bg-app-card border border-app-border rounded-xl space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
              <div className="pt-3 border-t border-app-border flex justify-between">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-7 w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <ErrorState
          title="Erro ao carregar documentos"
          message={error}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !error && documents.length === 0 && (
        <EmptyState
          icon={<BookOpen className="w-12 h-12 text-brand-400" />}
          title="Nenhum documento encontrado"
          description={
            filters.search || filters.type || filters.audience || filters.situation !== 'vigentes'
              ? 'Nenhum documento atende aos filtros aplicados. Tente ajustar os parâmetros de pesquisa.'
              : 'Nenhum documento oficial foi cadastrado ainda. Envie o primeiro arquivo PDF para habilitar a busca pela IA.'
          }
          action={
            isRh ? (
              <Button variant="primary" size="sm" onClick={handleOpenNewUpload} className="mt-2 text-xs">
                <Plus className="w-4 h-4 mr-1.5" />
                Adicionar Documento Oficial
              </Button>
            ) : undefined
          }
        />
      )}

      {!isLoading && !error && documents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              userRole={userRole}
              isHighlighted={doc.id === highlightedDocId}
              onViewChunks={handleViewChunks}
              onTestQuestion={handleTestQuestion}
              onNewVersion={handleNewVersion}
              onArchiveToggle={() =>
                showToast(`A ação de arquivar documento será disponibilizada na Fase C.`)
              }
              onRetryUpload={() => handleNewVersion(doc)}
            />
          ))}
        </div>
      )}

      {/* Diálogo de Upload de Documento Oficial */}
      <UploadDocumentDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleUploadSuccess}
        existingDocuments={documents}
        prefilledTitle={uploadPrefillTitle}
        prefilledType={uploadPrefillType}
      />
    </div>
  );
};
