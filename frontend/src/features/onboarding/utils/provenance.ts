// frontend/src/features/onboarding/utils/provenance.ts
import { FieldProvenance } from '../types';

/**
 * Normaliza valores para comparação (strings sem espaços nas pontas, nulos como vazio)
 */
function normalizeVal(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Determina a proveniência do valor de um campo:
 * - 'ia': Veio do documento extraído e não foi alterado pelo analista.
 * - 'editado': Veio do documento extraído mas o analista modificou o valor.
 * - 'digitado': Não existia no documento extraído e foi digitado manualmente pelo analista.
 */
export function getFieldProvenance(
  field: string,
  extractedData?: Record<string, any> | null,
  currentValue?: any
): FieldProvenance {
  if (!extractedData) {
    return 'digitado';
  }

  // Se extractedData tem formato aninhado { cadastro: ... }
  const sourceObj = extractedData.cadastro || extractedData;
  const rawExtracted = sourceObj?.[field];
  const hasExtracted = rawExtracted !== undefined && rawExtracted !== null && String(rawExtracted).trim() !== '';

  const normExtracted = normalizeVal(rawExtracted);
  const normCurrent = normalizeVal(currentValue);

  if (!hasExtracted) {
    return 'digitado';
  }

  if (normExtracted === normCurrent) {
    return 'ia';
  }

  return 'editado';
}

/**
 * Verifica se um caso possui algum dado extraído por IA de documentos.
 * Se for 100% manual (sem dados de documento), retorna false.
 */
export function hasAnyAiExtractedData(extractedData?: Record<string, any> | null): boolean {
  if (!extractedData) return false;
  const sourceObj = extractedData.cadastro || extractedData;
  if (!sourceObj || typeof sourceObj !== 'object') return false;

  return Object.values(sourceObj).some(
    (v) => v !== undefined && v !== null && String(v).trim().length > 0
  );
}
