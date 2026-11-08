// backend/src/services/onboardingService.js
const path = require('path');
const { execFileSync } = require('child_process');
const bcrypt = require('bcryptjs');
const documentExtractor = require('../ai/documentExtractor');
const onboardingValidator = require('./onboardingValidator');
const onboardingRepository = require('../repositories/onboardingRepository');
const employeeRepository = require('../repositories/employeeRepository');

/**
 * Extrai texto de um buffer PDF executando pdf-parse em processo filho isolado.
 * Isso elimina de vez a contaminação de estado global do pdfjs-dist bundled
 * que ocorre quando o geminiClient já carregou outro PDF no mesmo processo.
 */
async function extractTextFromPdf(buffer) {
  const workerPath = path.resolve(__dirname, '../helpers/parsePdfWorker.mjs');
  const b64 = buffer.toString('base64');

  const stdout = execFileSync(process.execPath, [workerPath], {
    input: b64,
    maxBuffer: 20 * 1024 * 1024,
    timeout: 30000
  });

  const result = JSON.parse(stdout.toString('utf8'));
  if (!result.ok) {
    throw new Error(result.error || 'Falha ao extrair texto do PDF');
  }
  return result.text;
}

/**
 * Processa o upload de um PDF de admissão:
 * Valida assinatura, extrai texto, aciona IA para extrair campos, valida no backend e cria o caso.
 */
async function processUpload({ fileBuffer, fileName, userId }) {
  // 1. Validação da assinatura mágica (%PDF)
  if (!fileBuffer || fileBuffer.length < 4 || fileBuffer.toString('utf8', 0, 4) !== '%PDF') {
    const error = new Error('Arquivo inválido: o arquivo enviado não possui a assinatura mágica de um PDF válido (%PDF).');
    error.status = 400;
    throw error;
  }

  // 2. Extração do texto selecionável com pdf-parse (cache isolado)
  let text = '';
  try {
    text = await extractTextFromPdf(fileBuffer);
  } catch (err) {
    console.error('Erro no pdf-parse:', err.message);
    const error = new Error('Falha ao processar o arquivo PDF. Verifique se o arquivo não está corrompido.');
    error.status = 400;
    throw error;
  }

  // 3. Se vier vazio (sem texto selecionável) responde 422
  if (!text || text.length === 0) {
    const error = new Error('PDF sem texto selecionável. Documentos escaneados ou imagens estão fora do escopo desta versão.');
    error.status = 422;
    throw error;
  }

  // 4. Envia o texto ao Gemini para extração estruturada
  const extractedData = await documentExtractor.extractCandidateData(text);

  // 5. Validação determinística no backend
  const validationIssues = await onboardingValidator.validateCandidateData(extractedData);

  // 6. Salva o caso no banco
  const created = await onboardingRepository.createCase({
    sourceFileName: fileName,
    extractedJson: extractedData,
    reviewedJson: extractedData,
    validationIssues,
    createdBy: userId
  });

  return {
    id: created.Id,
    status: created.Status,
    sourceFileName: fileName,
    extractedData,
    validationIssues,
    canApprove: !onboardingValidator.isApprovalBlocked(validationIssues),
    createdAt: created.CreatedAt
  };
}

/**
 * Lista casos com filtro opcional por status
 */
async function listCases(status) {
  return await onboardingRepository.listCases(status);
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

  const extractedData = JSON.parse(caseObj.ExtractedJson);
  const reviewedData = caseObj.ReviewedJson ? JSON.parse(caseObj.ReviewedJson) : extractedData;
  const validationIssues = caseObj.ValidationIssues ? JSON.parse(caseObj.ValidationIssues) : [];

  return {
    id: caseObj.Id,
    status: caseObj.Status,
    sourceFileName: caseObj.SourceFileName,
    extractedData,
    reviewedData,
    validationIssues,
    canApprove: caseObj.Status === 'pendente_revisao' && !onboardingValidator.isApprovalBlocked(validationIssues),
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

  // Revalida os dados corrigidos
  const validationIssues = await onboardingValidator.validateCandidateData(updatedData);

  // Atualiza no banco
  await onboardingRepository.updateCase(id, {
    reviewedJson: updatedData,
    validationIssues
  });

  return {
    id: Number(id),
    status: caseObj.Status,
    reviewedData: updatedData,
    validationIssues,
    canApprove: !onboardingValidator.isApprovalBlocked(validationIssues)
  };
}

/**
 * Aprova o caso e cria o User + Employee de forma transacional
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

  const candidateData = caseObj.ReviewedJson ? JSON.parse(caseObj.ReviewedJson) : JSON.parse(caseObj.ExtractedJson);

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

  // Executa transação no repositório
  const result = await employeeRepository.createFromOnboarding({
    caseId: id,
    reviewerUserId,
    candidateData,
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
  processUpload,
  listCases,
  getCaseById,
  updateReview,
  approveCase,
  rejectCase
};
