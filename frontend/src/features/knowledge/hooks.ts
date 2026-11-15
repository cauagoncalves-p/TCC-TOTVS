// frontend/src/features/knowledge/hooks.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { knowledgeApi } from './api';
import { KnowledgeDocument, DocumentFiltersState, UploadDocumentPayload, UploadDocumentResponse } from './types';

export function useKnowledgeDocuments(
  filters: DocumentFiltersState,
  page: number = 1,
  limit: number = 50
) {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async (isPolling = false) => {
    if (!isPolling) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const params: Record<string, any> = {
        page,
        limit
      };

      if (filters.type) {
        params.type = filters.type;
      }

      if (filters.situation === 'arquivadas') {
        params.archived = true;
      } else {
        params.archived = false;
      }

      if (filters.search && filters.search.trim()) {
        params.q = filters.search.trim();
      }

      const res = await knowledgeApi.listDocuments(params);

      // Filtra situação no cliente se for 'vigentes' ou 'historicas'
      let filteredData = res.data;
      if (filters.situation === 'vigentes') {
        filteredData = filteredData.filter(d => d.isCurrent && !d.isArchived);
      } else if (filters.situation === 'historicas') {
        filteredData = filteredData.filter(d => !d.isCurrent && !d.isArchived);
      }

      // Filtra por público no cliente caso selecionado
      if (filters.audience) {
        filteredData = filteredData.filter(d => d.audience === filters.audience);
      }

      setDocuments(filteredData);
      setTotal(res.pagination.total);
    } catch (err: any) {
      console.error('Erro ao buscar documentos da base de conhecimento:', err);
      const msg = err.response?.data?.error || err.message || 'Erro ao carregar documentos da base de conhecimento.';
      setError(msg);
    } finally {
      if (!isPolling) {
        setIsLoading(false);
      }
    }
  }, [filters.type, filters.situation, filters.audience, filters.search, page, limit]);

  useEffect(() => {
    fetchDocuments(false);
  }, [fetchDocuments]);

  // Polling automático a cada 3s caso haja documentos com status 'processando'
  useEffect(() => {
    const hasProcessing = documents.some(d => d.indexStatus === 'processando');
    if (!hasProcessing) return;

    const intervalId = setInterval(() => {
      fetchDocuments(true);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [documents, fetchDocuments]);

  // Contadores de resumo
  const summary = {
    total: documents.length,
    indexados: documents.filter(d => d.indexStatus === 'indexado').length,
    processando: documents.filter(d => d.indexStatus === 'processando').length,
    falhou: documents.filter(d => d.indexStatus === 'falhou').length
  };

  return {
    documents,
    total,
    isLoading,
    error,
    refetch: () => fetchDocuments(false),
    summary
  };
}

export function useUploadDocument() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const upload = async (payload: UploadDocumentPayload): Promise<UploadDocumentResponse> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await knowledgeApi.uploadDocument(
        payload,
        (percent) => setProgress(percent),
        controller.signal
      );
      setProgress(100);
      return response;
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.message === 'canceled') {
        const cancelMsg = 'Envio cancelado pelo usuário.';
        setError(cancelMsg);
        throw new Error(cancelMsg);
      }

      let errorMsg = 'Falha de conexão. Verifique sua rede e tente novamente.';
      if (err.response) {
        const status = err.response.status;
        if (status === 413) {
          errorMsg = 'O arquivo passa do limite permitido de 20 MB.';
        } else if (status === 403) {
          errorMsg = 'Você não possui permissão para enviar documentos.';
        } else if (status === 422 || status === 400) {
          errorMsg = err.response.data?.error || 'Formato ou conteúdo de PDF inválido.';
        } else if (status === 502) {
          errorMsg = 'Não foi possível ler o PDF agora. Tente de novo ou envie um PDF com texto selecionável.';
        } else {
          errorMsg = err.response.data?.error || `Erro do servidor (${status}).`;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }

      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  };

  const cancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsUploading(false);
    setProgress(0);
  };

  return {
    upload,
    cancel,
    isUploading,
    progress,
    error,
    clearError: () => setError(null)
  };
}
