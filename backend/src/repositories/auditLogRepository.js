// backend/src/repositories/auditLogRepository.js
const { poolPromise } = require('../config/db');

/**
 * Registra uma ação na tabela de auditoria (somente INSERT pela aplicação)
 * @param {Object} entry { userId, action, entityType, entityId, detailsJson }
 */
async function log({ userId, action, entityType, entityId, detailsJson }) {
  const pool = await poolPromise;

  // Mascara CPF se houver nos detalhes
  let cleanDetails = detailsJson;
  if (typeof cleanDetails === 'object' && cleanDetails !== null) {
    cleanDetails = JSON.stringify(cleanDetails);
  }
  if (typeof cleanDetails === 'string') {
    // Mascara padrões de CPF (ex: 123.456.789-00 ou 12345678900)
    cleanDetails = cleanDetails.replace(/\b(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})\b/g, '***.$2.***-**');
  }

  await pool.request()
    .input('userId', userId || null)
    .input('action', action)
    .input('entityType', entityType || null)
    .input('entityId', entityId ? String(entityId) : null)
    .input('details', cleanDetails || null)
    .query(`
      INSERT INTO dbo.ComplianceAuditLog (UserId, Action, EntityType, EntityId, DetailsJson, CreatedAt)
      VALUES (@userId, @action, @entityType, @entityId, @details, SYSUTCDATETIME())
    `);
}

/**
 * Lista o log de auditoria paginado
 * @param {Object} options { limit, offset }
 */
async function listLogs({ limit = 50, offset = 0 } = {}) {
  const pool = await poolPromise;
  const uTbl = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE LOWER(TABLE_NAME) = 'users'");
  const userTable = uTbl.recordset[0]?.TABLE_NAME || 'users';

  const countRes = await pool.request().query('SELECT COUNT(*) AS total FROM dbo.ComplianceAuditLog');
  const total = countRes.recordset[0]?.total || 0;

  const result = await pool.request()
    .input('limit', limit)
    .input('offset', offset)
    .query(`
      SELECT
        l.Id,
        l.UserId,
        u.name AS UserName,
        u.role AS UserRole,
        l.Action,
        l.EntityType,
        l.EntityId,
        l.DetailsJson,
        l.CreatedAt
      FROM dbo.ComplianceAuditLog l
      LEFT JOIN dbo.[${userTable}] u ON u.id = l.UserId
      ORDER BY l.CreatedAt DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);

  return {
    total,
    limit,
    offset,
    logs: result.recordset.map(row => ({
      ...row,
      details: row.DetailsJson ? JSON.parse(row.DetailsJson) : null
    }))
  };
}

module.exports = {
  log,
  listLogs
};
