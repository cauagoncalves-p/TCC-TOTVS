// frontend/src/features/knowledge/utils.ts
import { DocType, Audience, IndexStatus, KnowledgeDocument } from './types';

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  clt: 'Legislação / CLT',
  esocial_manual: 'Manual eSocial',
  esocial_leiaute: 'Leiaute eSocial',
  nota_tecnica: 'Nota técnica',
  acordo_convencao: 'Acordo / Convenção',
  politica_interna: 'Política interna',
  outro: 'Outro'
};

export const AUDIENCE_LABELS: Record<Audience, string> = {
  rh: 'Somente RH',
  colaboradores: 'Colaboradores',
  todos: 'Todos'
};

export const INDEX_STATUS_LABELS: Record<IndexStatus, string> = {
  indexado: 'Indexado',
  processando: 'Processando...',
  falhou: 'Falhou'
};

export type ValidityStatus = 'vigente' | 'historica' | 'ainda_nao_vigente' | 'vencida' | 'arquivada';

export const VALIDITY_LABELS: Record<ValidityStatus, string> = {
  vigente: 'Vigente',
  historica: 'Histórica',
  ainda_nao_vigente: 'Ainda não vigente',
  vencida: 'Vencida',
  arquivada: 'Arquivada'
};

/**
 * Calcula a situação real de vigência do documento
 */
export function calculateValidityStatus(doc: KnowledgeDocument): ValidityStatus {
  if (doc.isArchived) {
    return 'arquivada';
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  if (doc.effectiveFrom && doc.effectiveFrom > todayStr) {
    return 'ainda_nao_vigente';
  }

  if (doc.effectiveTo && doc.effectiveTo < todayStr) {
    return 'vencida';
  }

  if (!doc.isCurrent) {
    return 'historica';
  }

  return 'vigente';
}

/**
 * Formata o tamanho do documento ou indica se foi escrito na plataforma
 */
export function formatDocumentSize(doc: KnowledgeDocument): string {
  if (doc.sourceKind === 'texto') {
    return 'Texto escrito na plataforma';
  }

  if (!doc.sizeBytes) {
    return 'Documento PDF';
  }

  const bytes = doc.sizeBytes;
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Formata datas no padrão dd/mm/aaaa
 */
export function formatBrDate(dateStr?: string | null): string {
  if (!dateStr) return 'Indeterminada';
  try {
    const parts = dateStr.slice(0, 10).split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return new Date(dateStr).toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

/**
 * Detecta presença de dados pessoais (CPF, e-mail, telefone)
 */
export function detectPiiWarnings(text: string): string[] {
  if (!text) return [];
  const warnings: string[] = [];

  const cpfRegex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
  const phoneRegex = /\b(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-\s]?\d{4}\b/;

  if (cpfRegex.test(text)) {
    warnings.push('Aviso LGPD: Padrão de CPF identificado no texto.');
  }
  if (emailRegex.test(text)) {
    warnings.push('Aviso LGPD: Endereço de e-mail identificado no texto.');
  }
  if (phoneRegex.test(text)) {
    warnings.push('Aviso LGPD: Número de telefone identificado no texto.');
  }

  return warnings;
}
