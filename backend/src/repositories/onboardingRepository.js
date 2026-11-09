// backend/src/repositories/onboardingRepository.js
const { poolPromise } = require('../config/db');

/**
 * Cria um novo caso de onboarding (por PDF ou manual)
 */
async function createCase({
  sourceFileName = null,
  origin = 'pdf',
  extractedJson,
  reviewedJson,
  validationIssues,
  createdBy
}) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('sourceFileName', sourceFileName)
    .input('origin', origin)
    .input('extractedJson', JSON.stringify(extractedJson))
    .input('reviewedJson', reviewedJson ? JSON.stringify(reviewedJson) : JSON.stringify(extractedJson))
    .input('validationIssues', validationIssues ? JSON.stringify(validationIssues) : '[]')
    .input('createdBy', createdBy)
    .query(`
      INSERT INTO dbo.OnboardingCases (
        SourceFileName, Origin, ExtractedJson, ReviewedJson, ValidationIssues, CreatedBy, CreatedAt, Status
      )
      OUTPUT INSERTED.Id, INSERTED.Status, INSERTED.Origin, INSERTED.SourceFileName, INSERTED.CreatedAt
      VALUES (
        @sourceFileName, @origin, @extractedJson, @reviewedJson, @validationIssues, @createdBy, SYSUTCDATETIME(), 'pendente_revisao'
      )
    `);
  return result.recordset[0];
}

/**
 * Registra um documento associado a um caso de onboarding
 */
async function addDocument({
  caseId,
  fileName,
  documentType,
  typeSource = 'ia',
  extractionMethod = 'pdf_nativo',
  pageCount = null,
  extractedJson,
  evidenceReport = null,
  createdBy
}) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('caseId', caseId)
    .input('fileName', fileName)
    .input('documentType', documentType)
    .input('typeSource', typeSource)
    .input('extractionMethod', extractionMethod)
    .input('pageCount', pageCount)
    .input('extractedJson', typeof extractedJson === 'string' ? extractedJson : JSON.stringify(extractedJson))
    .input('evidenceReport', evidenceReport ? (typeof evidenceReport === 'string' ? evidenceReport : JSON.stringify(evidenceReport)) : null)
    .input('createdBy', createdBy)
    .query(`
      INSERT INTO dbo.OnboardingDocuments (
        CaseId, FileName, DocumentType, TypeSource, ExtractionMethod, PageCount, ExtractedJson, EvidenceReport, CreatedBy, CreatedAt
      )
      OUTPUT INSERTED.Id, INSERTED.CaseId, INSERTED.FileName, INSERTED.DocumentType, INSERTED.TypeSource,
             INSERTED.ExtractionMethod, INSERTED.PageCount, INSERTED.ExtractedJson, INSERTED.EvidenceReport,
             INSERTED.CreatedBy, INSERTED.CreatedAt
      VALUES (
        @caseId, @fileName, @documentType, @typeSource, @extractionMethod, @pageCount, @extractedJson, @evidenceReport, @createdBy, SYSUTCDATETIME()
      )
    `);
  return result.recordset[0];
}

/**
 * Busca todos os documentos vinculados a um caso
 */
async function getDocumentsByCaseId(caseId) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('caseId', caseId)
    .query(`
      SELECT
        d.Id, d.CaseId, d.FileName, d.DocumentType, d.TypeSource, d.ExtractionMethod,
        d.PageCount, d.ExtractedJson, d.EvidenceReport, d.CreatedBy, d.CreatedAt,
        u.name AS CreatedByName
      FROM dbo.OnboardingDocuments d
      LEFT JOIN dbo.users u ON u.id = d.CreatedBy
      WHERE d.CaseId = @caseId
      ORDER BY d.CreatedAt ASC, d.Id ASC
    `);
  return result.recordset;
}

/**
 * Busca um documento pelo ID
 */
async function getDocumentById(docId) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('docId', docId)
    .query(`
      SELECT
        d.Id, d.CaseId, d.FileName, d.DocumentType, d.TypeSource, d.ExtractionMethod,
        d.PageCount, d.ExtractedJson, d.EvidenceReport, d.CreatedBy, d.CreatedAt
      FROM dbo.OnboardingDocuments d
      WHERE d.Id = @docId
    `);
  return result.recordset[0];
}

/**
 * Remove um documento de um caso
 */
async function deleteDocument(docId) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('docId', docId)
    .query(`
      DELETE FROM dbo.OnboardingDocuments
      OUTPUT DELETED.Id, DELETED.CaseId, DELETED.FileName
      WHERE Id = @docId
    `);
  return result.recordset[0];
}

/**
 * Busca caso pelo ID
 */
async function getById(id) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', id)
    .query(`
      SELECT
        c.Id, c.Status, c.Origin, c.SourceFileName, c.ExtractedJson, c.ReviewedJson, c.ValidationIssues,
        c.CreatedBy, c.CreatedAt, c.ReviewedBy, c.ReviewedAt, c.EmployeeId, c.RejectionReason,
        uCreator.name AS CreatedByName,
        uReviewer.name AS ReviewedByName
      FROM dbo.OnboardingCases c
      LEFT JOIN dbo.users uCreator ON uCreator.id = c.CreatedBy
      LEFT JOIN dbo.users uReviewer ON uReviewer.id = c.ReviewedBy
      WHERE c.Id = @id
    `);
  return result.recordset[0];
}

/**
 * Lista casos com filtro opcional por status
 */
async function listCases(status) {
  const pool = await poolPromise;
  const request = pool.request();
  let query = `
    SELECT
      c.Id, c.Status, c.Origin, c.SourceFileName, c.CreatedAt, c.ReviewedAt, c.EmployeeId,
      uCreator.name AS CreatedByName,
      uReviewer.name AS ReviewedByName
    FROM dbo.OnboardingCases c
    LEFT JOIN dbo.users uCreator ON uCreator.id = c.CreatedBy
    LEFT JOIN dbo.users uReviewer ON uReviewer.id = c.ReviewedBy
  `;

  if (status) {
    request.input('status', status);
    query += ` WHERE c.Status = @status`;
  }

  query += ` ORDER BY c.CreatedAt DESC`;
  const result = await request.query(query);
  return result.recordset;
}

/**
 * Atualiza os dados de um caso (dados extraídos, dados revisados e problemas de validação)
 */
async function updateCase(id, { sourceFileName, extractedJson, reviewedJson, validationIssues }) {
  const pool = await poolPromise;
  const request = pool.request().input('id', id);

  const setClauses = [];
  if (sourceFileName !== undefined) {
    request.input('sourceFileName', sourceFileName);
    setClauses.push('SourceFileName = @sourceFileName');
  }
  if (extractedJson !== undefined) {
    request.input('extractedJson', typeof extractedJson === 'string' ? extractedJson : JSON.stringify(extractedJson));
    setClauses.push('ExtractedJson = @extractedJson');
  }
  if (reviewedJson !== undefined) {
    request.input('reviewedJson', typeof reviewedJson === 'string' ? reviewedJson : JSON.stringify(reviewedJson));
    setClauses.push('ReviewedJson = @reviewedJson');
  }
  if (validationIssues !== undefined) {
    request.input('validationIssues', typeof validationIssues === 'string' ? validationIssues : JSON.stringify(validationIssues));
    setClauses.push('ValidationIssues = @validationIssues');
  }

  if (setClauses.length === 0) return;

  await request.query(`
    UPDATE dbo.OnboardingCases
    SET ${setClauses.join(', ')}
    WHERE Id = @id
  `);
}

/**
 * Rejeita o caso com justificativa
 */
async function rejectCase(id, { reviewedBy, rejectionReason }) {
  const pool = await poolPromise;
  await pool.request()
    .input('id', id)
    .input('reviewedBy', reviewedBy)
    .input('reason', rejectionReason || null)
    .query(`
      UPDATE dbo.OnboardingCases
      SET Status = 'rejeitado',
          ReviewedBy = @reviewedBy,
          ReviewedAt = SYSUTCDATETIME(),
          RejectionReason = @reason
      WHERE Id = @id
    `);
}

module.exports = {
  createCase,
  addDocument,
  getDocumentsByCaseId,
  getDocumentById,
  deleteDocument,
  getById,
  listCases,
  updateCase,
  rejectCase
};
