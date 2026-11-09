// backend/src/repositories/esocialEventRepository.js
const { poolPromise } = require('../config/db');

async function listEvents({ status, eventCode } = {}) {
  const pool = await poolPromise;
  const request = pool.request();
  const whereClauses = [];

  if (status) {
    request.input('status', status);
    whereClauses.push('ev.Status = @status');
  }

  if (eventCode) {
    request.input('eventCode', eventCode);
    whereClauses.push('ev.EventCode = @eventCode');
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const query = `
    SELECT
      ev.Id,
      ev.EmployeeId,
      e.FullName AS EmployeeName,
      e.Registration AS EmployeeRegistration,
      e.Department AS EmployeeDepartment,
      ev.LeaveId,
      ev.EventCode,
      CONVERT(VARCHAR(10), ev.EventDate, 120) AS EventDate,
      ev.Status,
      ev.LastRunId,
      ev.ConfirmedBy,
      ev.ConfirmedAt
    FROM dbo.EsocialEvents ev
    JOIN dbo.Employees e ON e.Id = ev.EmployeeId
    LEFT JOIN dbo.Leaves l ON l.Id = ev.LeaveId
    ${whereSql}
    ORDER BY ev.EventDate DESC, ev.Id DESC
  `;

  const result = await request.query(query);
  return result.recordset;
}

async function getById(id) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', id)
    .query(`
      SELECT
        ev.Id,
        ev.EmployeeId,
        e.FullName AS EmployeeName,
        e.Registration AS EmployeeRegistration,
        e.Department AS EmployeeDepartment,
        ev.LeaveId,
        ev.EventCode,
        CONVERT(VARCHAR(10), ev.EventDate, 120) AS EventDate,
        ev.Status,
        ev.LastRunId,
        ev.ConfirmedBy,
        ev.ConfirmedAt
      FROM dbo.EsocialEvents ev
      JOIN dbo.Employees e ON e.Id = ev.EmployeeId
      LEFT JOIN dbo.Leaves l ON l.Id = ev.LeaveId
      WHERE ev.Id = @id
    `);
  return result.recordset[0];
}

async function updateStatus(id, { status, lastRunId }) {
  const pool = await poolPromise;
  await pool.request()
    .input('id', id)
    .input('status', status)
    .input('runId', lastRunId || null)
    .query(`
      UPDATE dbo.EsocialEvents
      SET Status = @status,
          LastRunId = COALESCE(@runId, LastRunId)
      WHERE Id = @id
    `);
}

async function confirmEvent(id, userId) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', id)
    .input('userId', userId)
    .query(`
      UPDATE dbo.EsocialEvents
      SET Status = 'enviado_simulado',
          ConfirmedBy = @userId,
          ConfirmedAt = SYSUTCDATETIME()
      WHERE Id = @id;

      SELECT * FROM dbo.EsocialEvents WHERE Id = @id;
    `);
  return result.recordset[0];
}

/**
 * Verifica se existem inconsistências abertas de prioridade alta associadas ao colaborador do evento
 */
async function hasOpenHighPriorityIssues(eventId) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('eventId', eventId)
    .query(`
      SELECT COUNT(*) AS HighIssuesCount
      FROM dbo.ComplianceIssues i
      JOIN dbo.EsocialEvents ev ON ev.EmployeeId = i.EmployeeId
      WHERE ev.Id = @eventId
        AND i.Status = 'aberta'
        AND i.Priority = 'alta'
    `);
  return (result.recordset[0]?.HighIssuesCount || 0) > 0;
}

module.exports = {
  listEvents,
  getById,
  updateStatus,
  confirmEvent,
  hasOpenHighPriorityIssues
};
