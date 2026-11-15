// frontend/src/features/knowledge/api.ts
import { http } from '../../services/http';
import {
  DocumentListResponse,
  DocumentChunksResponse,
  KnowledgeDocument,
  UploadDocumentPayload,
  UploadDocumentResponse,
  CreatePolicyPayload,
  PatchDocumentPayload,
  TestQuestionPayload,
  TestQuestionResponse
} from './types';

export const knowledgeApi = {
  /**
   * Lista documentos de conhecimento com filtros e paginação
   */
  async listDocuments(params?: {
    type?: string;
    status?: string;
    archived?: boolean | string;
    q?: string;
    page?: number;
    limit?: number;
  }): Promise<DocumentListResponse> {
    const response = await http.get<DocumentListResponse>('/api/knowledge/documents', {
      params
    });
    return response.data;
  },

  /**
   * Obtém detalhes de um documento
   */
  async getDocument(id: number | string): Promise<KnowledgeDocument> {
    const response = await http.get<KnowledgeDocument>(`/api/knowledge/documents/${id}`);
    return response.data;
  },

  /**
   * Obtém os trechos (chunks) indexados de um documento
   */
  async getDocumentChunks(
    id: number | string,
    page: number = 1,
    limit: number = 30
  ): Promise<DocumentChunksResponse> {
    const response = await http.get<DocumentChunksResponse>(
      `/api/knowledge/documents/${id}/chunks`,
      {
        params: { page, limit }
      }
    );
    return response.data;
  },

  /**
   * Envia um arquivo PDF com progresso e suporte a cancelamento
   */
  async uploadDocument(
    payload: UploadDocumentPayload,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal
  ): Promise<UploadDocumentResponse> {
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('title', payload.title);
    formData.append('docType', payload.docType);
    formData.append('version', payload.version);
    formData.append('audience', payload.audience);

    if (payload.publishDate) formData.append('publishDate', payload.publishDate);
    if (payload.effectiveFrom) formData.append('effectiveFrom', payload.effectiveFrom);
    if (payload.effectiveTo) formData.append('effectiveTo', payload.effectiveTo);
    if (payload.sourceOrg) formData.append('sourceOrg', payload.sourceOrg);

    const response = await http.post<UploadDocumentResponse>(
      '/api/knowledge/documents',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        signal,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        }
      }
    );

    return response.data;
  },

  /**
   * Cria uma política escrita na plataforma
   */
  async createPolicy(payload: CreatePolicyPayload) {
    const response = await http.post('/api/knowledge/policies', payload);
    return response.data;
  },

  /**
   * Edita uma política gerando uma nova versão
   */
  async updatePolicy(id: number | string, payload: CreatePolicyPayload) {
    const response = await http.put(`/api/knowledge/policies/${id}`, payload);
    return response.data;
  },

  /**
   * Atualiza campos pontuais de um documento
   */
  async patchDocument(id: number | string, payload: PatchDocumentPayload) {
    const response = await http.patch(`/api/knowledge/documents/${id}`, payload);
    return response.data;
  },

  /**
   * Reindexa uma política escrita
   */
  async reindexDocument(id: number | string) {
    const response = await http.post(`/api/knowledge/documents/${id}/reindex`);
    return response.data;
  },

  /**
   * Testa uma pergunta na base de conhecimento
   */
  async testQuestion(payload: TestQuestionPayload): Promise<TestQuestionResponse> {
    const response = await http.post<TestQuestionResponse>(
      '/api/knowledge/test-question',
      payload
    );
    return response.data;
  },

  /**
   * Sugere estrutura em tópicos e FAQ para um texto de política
   */
  async structurePreview(rawText: string): Promise<{ suggestedMarkdown: string; disclaimer: string }> {
    const response = await http.post('/api/knowledge/policies/structure-preview', { rawText });
    return response.data;
  }
};
