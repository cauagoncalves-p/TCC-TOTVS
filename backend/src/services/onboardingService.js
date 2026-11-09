// backend/src/services/onboardingService.js
const path = require('path');
const { execFileSync } = require('child_process');
const bcrypt = require('bcryptjs');
const { PDFDocument } = require('pdf-lib');
const documentTypes = require('../ai/documentTypes');
const documentExtractor = require('../ai/documentExtractor');
const onboardingNormalizer = require('./onboardingNormalizer');
const onboardingFusion = require('./onboardingFusion');
const onboardingValidator = require('./onboardingValidator');
const onboardingRepository = require('../repositories/onboardingRepository');
const employeeRepository = require('../repositories/employeeRepository');

const MAX_PAGES = parseInt(process.env.MAX_PAGES, 10) || 10;

/**
 * Extrai texto selecionável de um buffer PDF usando o worker isolado
 */
async function extractTextFromPdf(buffer) {
  try {
    const workerPath = path.resolve(__dirname, '../helpers/parsePdfWorker.mjs');
    const b64 = buffer.toString('base64');

    const stdout = execFileSync(process.execPath, [workerPath], {
      input: b64,
      maxBuffer: 20 * 1024 * 1024,
      timeout: 30000
    });

    const result = JSON.parse(stdout.toString('utf8'));
    return result.ok ? (result.text || '') : '';
  } catch (err) {
    console.warn('Aviso: extração de texto via worker falhou:', err.message);
    return '';
  }
}

/**
 * Conta páginas do PDF e valida assinatura mágica (%PDF)
 */
async function inspectPdf(fileBuffer) {
  if (!fileBuffer || fileBuffer.length < 4 || fileBuffer.toString('utf8', 0, 4) !== '%PDF') {
    const error = new Error('Arquivo inválido: o arquivo enviado não possui a assinatura mágica de um PDF válido (%PDF).');
    error.status = 400;
    throw error;
  }

  let pageCount = 1;
  try {
    const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
    pageCount = pdfDoc.getPageCount();
  } catch (e) {
    console.warn('Aviso: falha ao ler contagem de páginas com pdf-lib:', e.message);
  }

  if (pageCount > MAX_PAGES) {
    const error = new Error(`O documento possui ${pageCount} páginas, excedendo o limite máximo permitido de ${MAX_PAGES} páginas.`);
    error.status = 400;
    throw error;
  }

  return { pageCount };
}

/**
 * Normaliza os objetos de payload do caso para compatibilidade híbrida
 */
function normalizeCasePayload(data) {
  if (!data) return { cadastro: {}, perfil: null };
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  if (parsed.cadastro || parsed.perfil !== undefined) {
    return {
      cadastro: parsed.cadastro || {},
      perfil: parsed.perfil || null,
      ...(parsed.cadastro || {})
    };
  }
  return {
    cadastro: parsed,
    perfil: null,
    ...parsed
  };
}

/**
 * Cria um caso de onboarding manualmente sem documento PDF (Parte 2C)
 * Aceita dados parciais e salva como rascunho.
 */
async function createManualCase({ cadastro = {}, perfil = null, userId }) {
  const cleanCadastro = cadastro || {};
  const cleanPerfil = perfil || null;

  // Validação centralizada dos dados cadastrais
  const validationIssues = await onboardingValidator.validateCandidateData(cleanCadastro);
  const canApprove = !onboardingValidator.isApprovalBlocked(validationIssues);

  const proposal = {
    cadastro: cleanCadastro,
    perfil: cleanPerfil
  };

  const createdCase = await onboardingRepository.createCase({
    sourceFileName: null,
    origin: 'manual',
    extractedJson: { cadastro: {}, perfil: {} },
    reviewedJson: proposal,
    validationIssues,
    createdBy: userId
  });

  return {
    id: createdCase.Id,
    caseId: createdCase.Id,
    status: createdCase.Status,
    origin: 'manual',
    sourceFileName: null,
    documents: [],
    extractedData: normalizeCasePayload({ cadastro: {}, perfil: {} }),
    reviewedData: normalizeCasePayload(proposal),
    validationIssues,
    canApprove,
    createdAt: createdCase.CreatedAt
  };
}

/**
 * Valida dados cadastrais sem gravar nada no banco (Parte 2C)
 */
async function validateManualCandidateData({ cadastro = {} }) {
  const cleanCadastro = cadastro || {};
  const validationIssues = await onboardingValidator.validateCandidateData(cleanCadastro);
  const canApprove = !onboardingValidator.isApprovalBlocked(validationIssues);

  return {
    validationIssues,
    issues: validationIssues,
    canApprove
  };
}

/**
 * Processa o upload inicial de um PDF de admissão (cria o caso e o 1º documento)
 */
async function processUpload({ fileBuffer, fileName, userId, documentType }) {
  // 1. Validação de PDF e contagem de páginas
  const { pageCount } = await inspectPdf(fileBuffer);

  // 2. Extração de texto para verificação de evidência e fallback
  const documentText = await extractTextFromPdf(fileBuffer);

  // 3. Classificação do documento
  let detectedType = documentType;
  let typeSource = 'analista';
  let classificationReason = 'Informado pelo analista de RH';

  if (!detectedType) {
    const classified = await documentExtractor.classifyDocument({ fileBuffer, documentText });
    detectedType = classified.documentType;
    typeSource = 'ia';
    classificationReason = classified.reason;
  } else {
    // Valida se o tipo informado existe no registro
    const valid = documentTypes.getTypeById(detectedType);
    if (!valid) {
      detectedType = 'outro';
    }
  }

  // 4. Extração estruturada conforme schema do tipo
  const { extractedData: rawExtracted, extractionMethod } = await documentExtractor.extractDocumentData({
    fileBuffer,
    documentText,
    documentType: detectedType
  });

  // 5. Normalização dos dados extraídos
  const normalizedData = onboardingNormalizer.normalizeExtractedData(detectedType, rawExtracted);

  // 6. Verificação de evidência textual (anti-alucinação)
  const { evidenceReport } = onboardingNormalizer.verifyEvidence(
    detectedType,
    normalizedData,
    documentText
  );

  // 7. Cria o caso no banco com Origin = 'pdf'
  const createdCase = await onboardingRepository.createCase({
    sourceFileName: fileName,
    origin: 'pdf',
    extractedJson: {},
    reviewedJson: {},
    validationIssues: [],
    createdBy: userId
  });

  // 8. Grava o 1º documento em OnboardingDocuments
  const createdDoc = await onboardingRepository.addDocument({
    caseId: createdCase.Id,
    fileName,
    documentType: detectedType,
    typeSource,
    extractionMethod,
    pageCount,
    extractedJson: normalizedData,
    evidenceReport,
    createdBy: userId
  });

  // 9. Fusão inicial com o documento criado
  const fused = onboardingFusion.fuseDocuments([createdDoc]);

  // 10. Validação por contexto do cadastro fundido
  const validationIssues = await onboardingValidator.validateCandidateData(fused.cadastro);
  const allIssues = [...validationIssues, ...fused.conflictIssues, ...fused.evidenceIssues];

  const proposal = {
    cadastro: fused.cadastro,
    perfil: fused.perfil
  };

  // 11. Atualiza o caso com os dados fundidos
  await onboardingRepository.updateCase(createdCase.Id, {
    extractedJson: proposal,
    reviewedJson: proposal,
    validationIssues: allIssues
  });

  const canApprove = !onboardingValidator.isApprovalBlocked(allIssues);

  return {
    id: createdCase.Id,
    caseId: createdCase.Id,
    status: createdCase.Status,
    origin: 'pdf',
    sourceFileName: fileName,
    document: {
      id: createdDoc.Id,
      fileName: createdDoc.FileName,
      documentType: createdDoc.DocumentType,
      typeSource: createdDoc.TypeSource,
      extractionMethod: createdDoc.ExtractionMethod,
      pageCount: createdDoc.PageCount,
      classificationReason
    },
    documents: [
      {
        id: createdDoc.Id,
        fileName: createdDoc.FileName,
        documentType: createdDoc.DocumentType,
        typeSource: createdDoc.TypeSource,
        extractionMethod: createdDoc.ExtractionMethod,
        pageCount: createdDoc.PageCount,
        createdAt: createdDoc.CreatedAt
      }
    ],
    extractedData: normalizeCasePayload(proposal),
    reviewedData: normalizeCasePayload(proposal),
    validationIssues: allIssues,
    canApprove,
    createdAt: createdCase.CreatedAt
  };
}

/**
 * Adiciona um documento adicional a um caso existente e refaz a fusão
 * O valor digitado/revisado pelo analista tem prioridade máxima (Parte 2C)
 */
async function addDocumentToCase({ caseId, fileBuffer, fileName, userId, documentType }) {
  const caseObj = await onboardingRepository.getById(caseId);
  if (!caseObj) {
    const error = new Error('Caso de onboarding não encontrado.');
    error.status = 404;
    throw error;
  }

  if (caseObj.Status !== 'pendente_revisao') {
    const error = new Error(`Não é possível adicionar documentos pois este caso está com status '${caseObj.Status}'.`);
    error.status = 409;
    throw error;
  }

  // 1. Validação de PDF e contagem de páginas
  const { pageCount } = await inspectPdf(fileBuffer);
  const documentText = await extractTextFromPdf(fileBuffer);

  // 2. Classificação
  let detectedType = documentType;
  let typeSource = 'analista';
  let classificationReason = 'Informado pelo analista de RH';

  if (!detectedType) {
    const classified = await documentExtractor.classifyDocument({ fileBuffer, documentText });
    detectedType = classified.documentType;
    typeSource = 'ia';
    classificationReason = classified.reason;
  } else {
    const valid = documentTypes.getTypeById(detectedType);
    if (!valid) detectedType = 'outro';
  }

  // 3. Extração e Normalização
  const { extractedData: rawExtracted, extractionMethod } = await documentExtractor.extractDocumentData({
    fileBuffer,
    documentText,
    documentType: detectedType
  });

  const normalizedData = onboardingNormalizer.normalizeExtractedData(detectedType, rawExtracted);

  // 4. Verificação de Evidência
  const { evidenceReport } = onboardingNormalizer.verifyEvidence(
    detectedType,
    normalizedData,
    documentText
  );

  // 5. Salva novo documento
  const newDoc = await onboardingRepository.addDocument({
    caseId,
    fileName,
    documentType: detectedType,
    typeSource,
    extractionMethod,
    pageCount,
    extractedJson: normalizedData,
    evidenceReport,
    createdBy: userId
  });

  // 6. Recupera todos os documentos do caso e refaz a fusão
  const allDocs = await onboardingRepository.getDocumentsByCaseId(caseId);

  // Obtém dados já digitados/revisados pelo analista no caso
  let currentReviewed = {};
  try {
    currentReviewed = caseObj.ReviewedJson ? JSON.parse(caseObj.ReviewedJson) : {};
  } catch (e) {
    currentReviewed = {};
  }
  const manualCadastro = currentReviewed.cadastro || (currentReviewed.fullName !== undefined ? currentReviewed : {});
  const manualPerfil = currentReviewed.perfil || null;

  // A fusão considera o que o analista digitou como prioridade máxima (prioridade 0)
  const fusedWithManual = onboardingFusion.fuseDocuments(allDocs, {
    cadastro: manualCadastro,
    perfil: manualPerfil
  });

  // Também calcula o que a IA leu separadamente para ExtractedJson
  const fusedDocsOnly = onboardingFusion.fuseDocuments(allDocs);

  // 7. Validação por contexto do cadastro resultante
  const validationIssues = await onboardingValidator.validateCandidateData(fusedWithManual.cadastro);
  const allIssues = [...validationIssues, ...fusedWithManual.conflictIssues, ...fusedWithManual.evidenceIssues];

  const extractedProposal = {
    cadastro: fusedDocsOnly.cadastro,
    perfil: fusedDocsOnly.perfil
  };

  const reviewedProposal = {
    cadastro: fusedWithManual.cadastro,
    perfil: fusedWithManual.perfil
  };

  // 8. Atualiza caso no banco
  await onboardingRepository.updateCase(caseId, {
    extractedJson: extractedProposal,
    reviewedJson: reviewedProposal,
    validationIssues: allIssues
  });

  const canApprove = !onboardingValidator.isApprovalBlocked(allIssues);

  return {
    id: Number(caseId),
    status: caseObj.Status,
    origin: caseObj.Origin || 'pdf',
    sourceFileName: caseObj.SourceFileName || null,
    documentAdded: {
      id: newDoc.Id,
      fileName: newDoc.FileName,
      documentType: newDoc.DocumentType,
      typeSource: newDoc.TypeSource,
      classificationReason
    },
    documents: allDocs.map(d => ({
      id: d.Id,
      fileName: d.FileName,
      documentType: d.DocumentType,
      typeSource: d.TypeSource,
      extractionMethod: d.ExtractionMethod,
      pageCount: d.PageCount,
      createdAt: d.CreatedAt
    })),
    extractedData: normalizeCasePayload(extractedProposal),
    reviewedData: normalizeCasePayload(reviewedProposal),
    validationIssues: allIssues,
    canApprove
  };
}

/**
 * Remove um documento de um caso e refaz a fusão
 */
async function removeDocumentFromCase({ caseId, docId, userId }) {
  const caseObj = await onboardingRepository.getById(caseId);
  if (!caseObj) {
    const error = new Error('Caso de onboarding não encontrado.');
    error.status = 404;
    throw error;
  }

  if (caseObj.Status !== 'pendente_revisao') {
    const error = new Error(`Não é possível remover documentos pois este caso está com status '${caseObj.Status}'.`);
    error.status = 409;
    throw error;
  }

  const doc = await onboardingRepository.getDocumentById(docId);
  if (!doc || doc.CaseId !== Number(caseId)) {
    const error = new Error('Documento não encontrado neste caso de onboarding.');
    error.status = 404;
    throw error;
  }

  await onboardingRepository.deleteDocument(docId);

  // Refaz fusão com os documentos restantes
  const remainingDocs = await onboardingRepository.getDocumentsByCaseId(caseId);

  let currentReviewed = {};
  try {
    currentReviewed = caseObj.ReviewedJson ? JSON.parse(caseObj.ReviewedJson) : {};
  } catch (e) {
    currentReviewed = {};
  }
  const manualCadastro = currentReviewed.cadastro || (currentReviewed.fullName !== undefined ? currentReviewed : {});
  const manualPerfil = currentReviewed.perfil || null;

  const fusedWithManual = onboardingFusion.fuseDocuments(remainingDocs, {
    cadastro: manualCadastro,
    perfil: manualPerfil
  });
  const fusedDocsOnly = onboardingFusion.fuseDocuments(remainingDocs);

  const validationIssues = await onboardingValidator.validateCandidateData(fusedWithManual.cadastro);
  const allIssues = [...validationIssues, ...fusedWithManual.conflictIssues, ...fusedWithManual.evidenceIssues];

  const extractedProposal = {
    cadastro: fusedDocsOnly.cadastro,
    perfil: fusedDocsOnly.perfil
  };

  const reviewedProposal = {
    cadastro: fusedWithManual.cadastro,
    perfil: fusedWithManual.perfil
  };

  await onboardingRepository.updateCase(caseId, {
    extractedJson: extractedProposal,
    reviewedJson: reviewedProposal,
    validationIssues: allIssues
  });

  const canApprove = !onboardingValidator.isApprovalBlocked(allIssues);

  return {
    message: 'Documento removido com sucesso e fusão recalculada.',
    caseId: Number(caseId),
    removedDocId: Number(docId),
    origin: caseObj.Origin || 'pdf',
    sourceFileName: caseObj.SourceFileName || null,
    documents: remainingDocs.map(d => ({
      id: d.Id,
      fileName: d.FileName,
      documentType: d.DocumentType,
      typeSource: d.TypeSource,
      extractionMethod: d.ExtractionMethod,
      pageCount: d.PageCount,
      createdAt: d.CreatedAt
    })),
    extractedData: normalizeCasePayload(extractedProposal),
    reviewedData: normalizeCasePayload(reviewedProposal),
    validationIssues: allIssues,
    canApprove
  };
}

/**
 * Lista casos com filtro opcional por status
 */
async function listCases(status) {
  const cases = await onboardingRepository.listCases(status);
  return cases.map(c => ({
    Id: c.Id,
    Status: c.Status,
    Origin: c.Origin || 'pdf',
    SourceFileName: c.SourceFileName || null,
    CreatedAt: c.CreatedAt,
    ReviewedAt: c.ReviewedAt || null,
    EmployeeId: c.EmployeeId || null,
    CreatedByName: c.CreatedByName || null,
    ReviewedByName: c.ReviewedByName || null
  }));
}

/**
 * Retorna o detalhe de um caso pelo ID
 */
async function getCaseById(id) {
  const caseObj = await onboardingRepository.getById(id);
  if (!caseObj) {
    const error = new Error('Caso de onboarding não encontrado.');
    error.status = 404;
    throw error;
  }

  const documents = await onboardingRepository.getDocumentsByCaseId(id);

  let rawExtracted = {};
  let rawReviewed = {};
  let validationIssues = [];

  try {
    rawExtracted = caseObj.ExtractedJson ? JSON.parse(caseObj.ExtractedJson) : {};
  } catch (e) {
    rawExtracted = {};
  }

  try {
    rawReviewed = caseObj.ReviewedJson ? JSON.parse(caseObj.ReviewedJson) : rawExtracted;
  } catch (e) {
    rawReviewed = rawExtracted;
  }

  try {
    validationIssues = caseObj.ValidationIssues ? JSON.parse(caseObj.ValidationIssues) : [];
  } catch (e) {
    validationIssues = [];
  }

  const extractedData = normalizeCasePayload(rawExtracted);
  const reviewedData = normalizeCasePayload(rawReviewed);
  const canApprove = caseObj.Status === 'pendente_revisao' && !onboardingValidator.isApprovalBlocked(validationIssues);

  return {
    id: caseObj.Id,
    status: caseObj.Status,
    origin: caseObj.Origin || 'pdf',
    sourceFileName: caseObj.SourceFileName || null,
    documents: documents.map(d => ({
      id: d.Id,
      fileName: d.FileName,
      documentType: d.DocumentType,
      typeSource: d.TypeSource,
      extractionMethod: d.ExtractionMethod,
      pageCount: d.PageCount,
      createdAt: d.CreatedAt
    })),
    extractedData,
    reviewedData,
    validationIssues,
    canApprove,
    createdBy: caseObj.CreatedBy,
    createdByName: caseObj.CreatedByName,
    createdAt: caseObj.CreatedAt,
    reviewedBy: caseObj.ReviewedBy,
    reviewedByName: caseObj.ReviewedByName,
    reviewedAt: caseObj.ReviewedAt,
    employeeId: caseObj.EmployeeId,
    rejectionReason: caseObj.RejectionReason
  };
}

/**
 * Salva as correções do analista em ReviewedJson e revalida
 */
async function updateReview(id, updatedData) {
  const caseObj = await onboardingRepository.getById(id);
  if (!caseObj) {
    const error = new Error('Caso de onboarding não encontrado.');
    error.status = 404;
    throw error;
  }

  if (caseObj.Status !== 'pendente_revisao') {
    const error = new Error(`Não é possível editar este caso pois ele já se encontra com status '${caseObj.Status}'.`);
    error.status = 409;
    throw error;
  }

  // Suporta tanto { cadastro, perfil } quanto objeto plano legado
  let cadastroToValidate = {};
  let perfilToSave = null;

  if (updatedData && (updatedData.cadastro || updatedData.perfil !== undefined)) {
    cadastroToValidate = updatedData.cadastro || {};
    perfilToSave = updatedData.perfil || null;
  } else {
    cadastroToValidate = updatedData || {};
    try {
      const prev = caseObj.ReviewedJson ? JSON.parse(caseObj.ReviewedJson) : {};
      perfilToSave = prev.perfil || null;
    } catch (e) {
      perfilToSave = null;
    }
  }

  // Revalida os dados cadastrais corrigidos
  const validationIssues = await onboardingValidator.validateCandidateData(cadastroToValidate);

  // Preserva avisos existentes (conflitos ou evidências) se houver
  let existingIssues = [];
  try {
    existingIssues = caseObj.ValidationIssues ? JSON.parse(caseObj.ValidationIssues) : [];
  } catch (e) {
    existingIssues = [];
  }
  const advisoryIssues = existingIssues.filter(i => i.nature === 'aviso' || i.code === 'VALUE_NOT_IN_DOCUMENT' || i.code === 'FIELD_CONFLICT');

  const combinedIssues = [...validationIssues, ...advisoryIssues];

  const reviewedJsonToSave = {
    cadastro: cadastroToValidate,
    perfil: perfilToSave
  };

  await onboardingRepository.updateCase(id, {
    reviewedJson: reviewedJsonToSave,
    validationIssues: combinedIssues
  });

  const canApprove = !onboardingValidator.isApprovalBlocked(combinedIssues);

  return {
    id: Number(id),
    status: caseObj.Status,
    origin: caseObj.Origin || 'pdf',
    sourceFileName: caseObj.SourceFileName || null,
    reviewedData: normalizeCasePayload(reviewedJsonToSave),
    validationIssues: combinedIssues,
    canApprove
  };
}

/**
 * Aprova o caso e cria o User + Employee + EmployeeProfile de forma transacional
 */
async function approveCase(id, reviewerUserId) {
  const caseObj = await onboardingRepository.getById(id);
  if (!caseObj) {
    const error = new Error('Caso de onboarding não encontrado.');
    error.status = 404;
    throw error;
  }

  if (caseObj.Status !== 'pendente_revisao') {
    const error = new Error(`Este caso já foi finalizado anteriormente com status '${caseObj.Status}'.`);
    error.status = 409;
    throw error;
  }

  let reviewed = {};
  try {
    reviewed = caseObj.ReviewedJson ? JSON.parse(caseObj.ReviewedJson) : JSON.parse(caseObj.ExtractedJson);
  } catch (e) {
    reviewed = {};
  }

  const candidateData = reviewed.cadastro || reviewed;
  const profileData = reviewed.perfil || null;

  // Revalida antes de aprovar
  const issues = await onboardingValidator.validateCandidateData(candidateData);
  if (onboardingValidator.isApprovalBlocked(issues)) {
    const error = new Error('Aprovação bloqueada: existem campos obrigatórios ausentes ou inconsistentes.');
    error.status = 422;
    error.details = issues;
    throw error;
  }

  // Senha temporária do novo colaborador ('123456')
  const tempPasswordHash = await bcrypt.hash('123456', 10);

  // Executa transação no repositório criando Employee, User e EmployeeProfile
  const result = await employeeRepository.createFromOnboarding({
    caseId: id,
    reviewerUserId,
    candidateData,
    profileData,
    tempPasswordHash
  });

  return {
    message: 'Colaborador admitido e cadastrado com sucesso!',
    caseId: Number(id),
    userId: result.userId,
    employeeId: result.employeeId,
    registration: result.registration,
    initialPassword: '123456'
  };
}

/**
 * Rejeita o caso com justificativa
 */
async function rejectCase(id, reviewerUserId, reason) {
  const caseObj = await onboardingRepository.getById(id);
  if (!caseObj) {
    const error = new Error('Caso de onboarding não encontrado.');
    error.status = 404;
    throw error;
  }

  if (caseObj.Status !== 'pendente_revisao') {
    const error = new Error(`Este caso já foi finalizado anteriormente com status '${caseObj.Status}'.`);
    error.status = 409;
    throw error;
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    const error = new Error('O motivo da rejeição é obrigatório.');
    error.status = 400;
    throw error;
  }

  await onboardingRepository.rejectCase(id, {
    reviewedBy: reviewerUserId,
    rejectionReason: reason.trim()
  });

  return {
    message: 'Caso de onboarding rejeitado com sucesso.',
    caseId: Number(id),
    status: 'rejeitado',
    rejectionReason: reason.trim()
  };
}

module.exports = {
  createManualCase,
  validateManualCandidateData,
  processUpload,
  addDocumentToCase,
  removeDocumentFromCase,
  listCases,
  getCaseById,
  updateReview,
  approveCase,
  rejectCase
};
