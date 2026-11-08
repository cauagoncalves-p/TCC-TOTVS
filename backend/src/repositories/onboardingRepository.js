// backend/src/repositories/onboardingRepository.js
const { poolPromise } = require('../config/db');

/**
 * Cria um novo caso de onboarding
 */
async function createCase({ sourceFileName, extractedJson, reviewedJson, validationIssues, createdBy }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('sourceFileName', sourceFileName)
    .input('extractedJson', JSON.stringify(extractedJson))
    .input('reviewedJson', reviewedJson ? JSON.stringify(reviewedJson) : JSON.stringify(extractedJson))
    .input('validationIssues', validationIssues ? JSON.stringify(validationIssues) : '[]')
    .input('createdBy', createdBy)
    .query(`
      INSERT INTO dbo.OnboardingCases (
        SourceFileName, ExtractedJson, ReviewedJson, ValidationIssues, CreatedBy, CreatedAt, Status
      )
      OUTPUT INSERTED.Id, INSERTED.Status, INSERTED.CreatedAt
      VALUES (
        @sourceFileName, @extractedJson, @reviewedJson, @validationIssues, @createdBy, SYSUTCDATETIME(), 'pendente_revisao'
      )
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
        c.Id, c.Status, c.SourceFileName, c.ExtractedJson, c.ReviewedJson, c.ValidationIssues,
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
      c.Id, c.Status, c.SourceFileName, c.CreatedAt, c.ReviewedAt, c.EmployeeId,
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
 * Atualiza os dados revisados e problemas de validação
 */
async function updateCase(id, { reviewedJson, validationIssues }) {
  const pool = await poolPromise;
  await pool.request()
    .input('id', id)
    .input('reviewedJson', JSON.stringify(reviewedJson))
    .input('validationIssues', JSON.stringify(validationIssues))
    .query(`
      UPDATE dbo.OnboardingCases
      SET ReviewedJson = @reviewedJson,
          ValidationIssues = @validationIssues
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
  getById,
  listCases,
  updateCase,
  rejectCase
};
