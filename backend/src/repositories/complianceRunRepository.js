// backend/src/repositories/complianceRunRepository.js
const { poolPromise } = require('../config/db');

async function createRun({ scope, eventCode, startedBy }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('scope', scope)
    .input('eventCode', eventCode || null)
    .input('startedBy', startedBy)
    .query(`
      INSERT INTO dbo.ComplianceRuns (Scope, EventCode, StartedBy, StartedAt)
      OUTPUT INSERTED.Id, INSERTED.Scope, INSERTED.EventCode, INSERTED.StartedBy, INSERTED.StartedAt
      VALUES (@scope, @eventCode, @startedBy, SYSUTCDATETIME())
    `);
  return result.recordset[0];
}

async function finishRun(id, { recordsAnalyzed, issuesNew, issuesOpen }) {
  const pool = await poolPromise;
  await pool.request()
    .input('id', id)
    .input('records', recordsAnalyzed)
    .input('issuesNew', issuesNew)
    .input('issuesOpen', issuesOpen)
    .query(`
      UPDATE dbo.ComplianceRuns
      SET FinishedAt = SYSUTCDATETIME(),
          RecordsAnalyzed = @records,
          IssuesNew = @issuesNew,
          IssuesOpen = @issuesOpen
      WHERE Id = @id
    `);
}

async function listRuns({ limit = 50 } = {}) {
  const pool = await poolPromise;
  // Identifica tabela de usuários
  const uTbl = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE LOWER(TABLE_NAME) = 'users'");
  const userTable = uTbl.recordset[0]?.TABLE_NAME || 'users';

  const result = await pool.request()
    .input('limit', limit)
    .query(`
      SELECT TOP (@limit)
        r.Id, r.Scope, r.EventCode, r.StartedBy, r.StartedAt, r.FinishedAt,
        r.RecordsAnalyzed, r.IssuesNew, r.IssuesOpen,
        u.name AS StartedByName
      FROM dbo.ComplianceRuns r
      LEFT JOIN dbo.[${userTable}] u ON u.id = r.StartedBy
      ORDER BY r.StartedAt DESC
    `);
  return result.recordset;
}

async function getById(id) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', id)
    .query('SELECT * FROM dbo.ComplianceRuns WHERE Id = @id');
  return result.recordset[0];
}

module.exports = {
  createRun,
  finishRun,
  listRuns,
  getById
};
