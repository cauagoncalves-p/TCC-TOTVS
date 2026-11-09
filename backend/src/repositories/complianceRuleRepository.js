// backend/src/repositories/complianceRuleRepository.js
const { poolPromise } = require('../config/db');

async function listRules({ category, isActive = true } = {}) {
  const pool = await poolPromise;
  const request = pool.request();
  const whereClauses = [];

  if (isActive !== undefined && isActive !== null) {
    request.input('isActive', isActive ? 1 : 0);
    whereClauses.push('IsActive = @isActive');
  }

  if (category) {
    request.input('category', category);
    whereClauses.push('Category = @category');
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const result = await request.query(`
    SELECT
      Id, Code, Category, EventCode, Severity, Title, Description, Guidance,
      SourceType, SourceReference, SourceVerified, IsActive
    FROM dbo.ComplianceRules
    ${whereSql}
    ORDER BY
      CASE Category WHEN 'integridade' THEN 1 WHEN 'clt' THEN 2 ELSE 3 END,
      Code ASC
  `);
  return result.recordset;
}

async function getByCode(code) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('code', code)
    .query('SELECT * FROM dbo.ComplianceRules WHERE Code = @code');
  return result.recordset[0];
}

async function getById(id) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', id)
    .query('SELECT * FROM dbo.ComplianceRules WHERE Id = @id');
  return result.recordset[0];
}

module.exports = {
  listRules,
  getByCode,
  getById
};
