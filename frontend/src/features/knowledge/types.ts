// frontend/src/features/knowledge/types.ts

export type DocType =
  | 'clt'
  | 'esocial_manual'
  | 'esocial_leiaute'
  | 'nota_tecnica'
  | 'acordo_convencao'
  | 'politica_interna'
  | 'outro';

export type Audience = 'rh' | 'colaboradores' | 'todos';

export type IndexStatus = 'processando' | 'indexado' | 'falhou';

export type ExtractionMethod = 'texto' | 'ocr_ia';

export type SourceKind = 'arquivo' | 'texto';

export interface KnowledgeDocument {
  id: number;
  title: string;
  docType: DocType;
  sourceOrg: string;
  sourceUrl?: string | null;
  version: string;
  publishedAt?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isCurrent: boolean;
  fileName?: string | null;
  uploadedBy: number;
  uploadedAt: string;
  audience: Audience;
  sourceKind: SourceKind;
  bodyText?: string | null;
  indexStatus: IndexStatus;
  indexError?: string | null;
  chunkCount: number;
  extractionMethod?: ExtractionMethod | null;
  sizeBytes?: number | null;
  isArchived: boolean;
  updatedAt?: string | null;
  previousVersionId?: number | null;
}

export interface KnowledgeChunk {
  id: number;
  documentId: number;
  chunkIndex: number;
  page?: number | null;
  sectionRef?: string | null;
  content: string;
}

export interface DocumentListResponse {
  data: KnowledgeDocument[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface DocumentChunksResponse {
  document: {
    id: number;
    title: string;
    version: string;
    chunkCount: number;
    indexStatus: IndexStatus;
  };
  chunks: KnowledgeChunk[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface UploadDocumentPayload {
  file: File;
  title: string;
  docType: DocType;
  version: string;
  publishDate?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  audience: Audience;
  sourceOrg?: string;
}

export interface UploadDocumentResponse {
  message: string;
  document: {
    id: number;
    title: string;
    docType: DocType;
    version: string;
    audience: Audience;
    indexStatus: IndexStatus;
    chunkCount: number;
    pageCount: number;
    extractionMethod: ExtractionMethod;
    previousVersionId?: number | null;
    piiWarnings?: string[];
  };
}

export interface CreatePolicyPayload {
  title: string;
  docType: 'politica_interna' | 'acordo_convencao';
  version: string;
  publishDate?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  audience: Audience;
  bodyText: string;
}

export interface PatchDocumentPayload {
  audience?: Audience;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isCurrent?: boolean;
  isArchived?: boolean;
  title?: string;
  version?: string;
}

export interface TestQuestionPayload {
  question: string;
  audienceScope?: 'rh' | 'colaborador' | 'todos';
}

export interface TestQuestionSource {
  title: string;
  docType: string;
  version: string;
  section?: string | null;
  page?: number | null;
  publishedAt?: string | null;
  score?: number;
}

export interface TestQuestionChunk {
  id: number;
  documentId: number;
  title: string;
  page?: number | null;
  sectionRef?: string | null;
  score: number;
  content: string;
}

export interface TestQuestionResponse {
  reply: string;
  sources: TestQuestionSource[];
  unconfirmed: boolean;
  chunks: TestQuestionChunk[];
}

export interface DocumentFiltersState {
  type: string;
  situation: 'todas' | 'vigentes' | 'historicas' | 'arquivadas';
  audience: string;
  search: string;
}
