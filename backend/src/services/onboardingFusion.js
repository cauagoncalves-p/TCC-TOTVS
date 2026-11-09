// backend/src/services/onboardingFusion.js
const documentTypes = require('../ai/documentTypes');

const PRIORITY_ORDER = {
  ficha_admissao: 1,
  documento_identidade: 2,
  comprovante_residencia: 3,
  curriculo: 4,
  outro: 5
};

const CADASTRO_FIELDS = [
  'fullName',
  'cpf',
  'rg',
  'birthDate',
  'email',
  'phone',
  'zipCode',
  'street',
  'city',
  'state',
  'jobTitle',
  'department',
  'hireDate',
  'baseSalary'
];

/**
 * Realiza a fusão de múltiplos documentos de um caso de onboarding e prioriza dados digitados
 * @param {Array<Object>} documents - Lista de registros de OnboardingDocuments
 * @param {Object} [manualData] - Dados cadastrais/perfil digitados ou revisados pelo analista
 * @returns {{ cadastro: Object, perfil: Object|null, conflictIssues: Array, evidenceIssues: Array }}
 */
function fuseDocuments(documents = [], manualData = null) {
  const hasDocuments = Array.isArray(documents) && documents.length > 0;

  // Extrai dados manuais caso fornecidos
  let manualCadastro = {};
  let manualPerfil = null;
  if (manualData) {
    if (manualData.cadastro || manualData.perfil !== undefined) {
      manualCadastro = manualData.cadastro || {};
      manualPerfil = manualData.perfil || null;
    } else {
      manualCadastro = manualData;
    }
  }

  // Prepara os documentos com tipos e extrações parseadas
  const parsedDocs = hasDocuments ? documents.map(doc => {
    let extracted = {};
    try {
      extracted = typeof doc.ExtractedJson === 'string' ? JSON.parse(doc.ExtractedJson) : (doc.ExtractedJson || {});
    } catch (e) {
      extracted = {};
    }

    const typeDef = documentTypes.getTypeById(doc.DocumentType) || documentTypes.getDefaultType();
    const docCadastro = typeDef.toCadastro ? typeDef.toCadastro(extracted) : {};
    const docPerfil = typeDef.toPerfil ? typeDef.toPerfil(extracted) : null;
    const priority = PRIORITY_ORDER[doc.DocumentType] || 99;

    let evidenceReport = null;
    try {
      if (doc.EvidenceReport) {
        evidenceReport = typeof doc.EvidenceReport === 'string' ? JSON.parse(doc.EvidenceReport) : doc.EvidenceReport;
      }
    } catch (e) {
      evidenceReport = null;
    }

    return {
      id: doc.Id,
      fileName: doc.FileName,
      docType: doc.DocumentType,
      priority,
      createdAt: doc.CreatedAt ? new Date(doc.CreatedAt).getTime() : doc.Id,
      docCadastro,
      docPerfil,
      evidenceReport
    };
  }) : [];

  // 1. Determina Perfil Profissional
  // Prioridade: se o analista digitou perfil, mantém o perfil manual.
  // Senão, pega do currículo mais recente.
  let perfil = manualPerfil;
  if (!perfil) {
    const resumeDocs = parsedDocs
      .filter(d => d.docType === 'curriculo' && d.docPerfil)
      .sort((a, b) => b.createdAt - a.createdAt);
    perfil = resumeDocs.length > 0 ? resumeDocs[0].docPerfil : null;
  }

  // 2. Determina Cadastro e Conflitos
  // Ordena documentos por prioridade ascendente (1 é a maior prioridade entre documentos)
  const sortedDocs = [...parsedDocs].sort((a, b) => a.priority - b.priority);

  const cadastro = {};
  const conflictIssues = [];

  for (const field of CADASTRO_FIELDS) {
    const candidates = [];

    // Prioridade máxima (0): valor digitado/corrigido pelo analista
    const manualVal = manualCadastro[field];
    if (manualVal !== undefined && manualVal !== null && String(manualVal).trim() !== '') {
      candidates.push({
        docId: null,
        docType: 'manual',
        priority: 0,
        val: manualVal
      });
    }

    // Candidatos provenientes de documentos
    for (const doc of sortedDocs) {
      const val = doc.docCadastro[field];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        candidates.push({
          docId: doc.id,
          docType: doc.docType,
          priority: doc.priority,
          val
        });
      }
    }

    // Ordena candidatos por prioridade (0 = manual > 1 = ficha > 2 = id > 3 = res > 4 = cv > 5 = outro)
    candidates.sort((a, b) => a.priority - b.priority);

    if (candidates.length > 0) {
      // Valor de maior prioridade adotado
      cadastro[field] = candidates[0].val;

      // Detecta conflito se houver valores divergentes
      const distinct = [];
      for (const cand of candidates) {
        const norm = String(cand.val).trim().toLowerCase();
        if (!distinct.some(d => String(d.val).trim().toLowerCase() === norm)) {
          distinct.push(cand);
        }
      }

      if (distinct.length > 1) {
        conflictIssues.push({
          field,
          code: 'FIELD_CONFLICT',
          nature: 'aviso',
          message: `Conflito no campo '${field}': '${distinct[0].val}' (${distinct[0].docType}) vs '${distinct[1].val}' (${distinct[1].docType}). Adotado o valor de maior prioridade.`,
          details: distinct.map(d => ({
            value: d.val,
            documentType: d.docType,
            documentId: d.docId
          }))
        });
      }
    } else {
      cadastro[field] = null;
    }
  }

  // 3. Coleta issues de evidência de todos os documentos
  const evidenceIssues = [];
  for (const doc of parsedDocs) {
    if (doc.evidenceReport && Array.isArray(doc.evidenceReport.unverified)) {
      for (const unvField of doc.evidenceReport.unverified) {
        evidenceIssues.push({
          field: unvField,
          code: 'VALUE_NOT_IN_DOCUMENT',
          nature: 'aviso',
          message: `O valor do campo '${unvField}' do documento '${doc.fileName}' (${doc.docType}) não foi localizado textualmente no documento original.`
        });
      }
    }
  }

  return {
    cadastro,
    perfil,
    conflictIssues,
    evidenceIssues
  };
}

module.exports = {
  fuseDocuments,
  CADASTRO_FIELDS,
  PRIORITY_ORDER
};
