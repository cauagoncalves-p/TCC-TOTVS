// backend/src/repositories/complianceIssueRepository.js
const { poolPromise } = require('../config/db');

async function list({ status, priority, eventCode, employeeId, department } = {}) {
  const pool = await poolPromise;
  const request = pool.request();
  const whereClauses = [];

  if (status) {
    request.input('status', status);
    whereClauses.push('i.Status = @status');
  }

  if (priority) {
    request.input('priority', priority);
    whereClauses.push('i.Priority = @priority');
  }

  if (eventCode) {
    request.input('eventCode', eventCode);
    whereClauses.push('i.EventCode = @eventCode');
  }

  if (employeeId) {
    request.input('empId', employeeId);
    whereClauses.push('i.EmployeeId = @empId');
  }

  if (department) {
    request.input('dept', department);
    whereClauses.push('e.Department = @dept');
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const query = `
    SELECT
      i.Id,
      i.RuleId,
      r.Code AS RuleCode,
      r.Title AS RuleTitle,
      r.Category AS RuleCategory,
      r.Guidance,
      r.SourceType,
      r.SourceReference,
      r.SourceVerified,
      i.EmployeeId,
      e.FullName AS EmployeeName,
      e.Registration AS EmployeeRegistration,
      e.Department AS EmployeeDepartment,
      i.EntityType,
      i.EntityId,
      i.EventCode,
      i.Priority,
      i.Description,
      i.Status,
      i.FirstRunId,
      i.LastRunId,
      i.DetectedAt,
      i.ResolvedBy,
      i.ResolvedAt,
      i.ResolutionNote
    FROM dbo.ComplianceIssues i
    JOIN dbo.ComplianceRules r ON r.Id = i.RuleId
    LEFT JOIN dbo.Employees e ON e.Id = i.EmployeeId
    ${whereSql}
    ORDER BY
      CASE i.Priority WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,
      i.DetectedAt DESC
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
        i.Id,
        i.RuleId,
        r.Code AS RuleCode,
        r.Title AS RuleTitle,
        r.Category AS RuleCategory,
        r.Guidance,
        r.SourceType,
        r.SourceReference,
        r.SourceVerified,
        i.EmployeeId,
        e.FullName AS EmployeeName,
        e.Registration AS EmployeeRegistration,
        e.Department AS EmployeeDepartment,
        i.EntityType,
        i.EntityId,
        i.EventCode,
        i.Priority,
        i.Description,
        i.Status,
        i.FirstRunId,
        i.LastRunId,
        i.DetectedAt,
        i.ResolvedBy,
        i.ResolvedAt,
        i.ResolutionNote
      FROM dbo.ComplianceIssues i
      JOIN dbo.ComplianceRules r ON r.Id = i.RuleId
      LEFT JOIN dbo.Employees e ON e.Id = i.EmployeeId
      WHERE i.Id = @id
    `);
  return result.recordset[0];
}

async function upsertIssue({ ruleId, employeeId, entityType, entityId, eventCode, priority, description, runId }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('ruleId', ruleId)
    .input('employeeId', employeeId || null)
    .input('entityType', entityType)
    .input('entityId', entityId)
    .input('eventCode', eventCode || null)
    .input('priority', priority)
    .input('description', description)
    .input('runId', runId)
    .query(`
      DECLARE @existingId INT;
      SELECT @existingId = Id FROM dbo.ComplianceIssues
      WHERE RuleId = @ruleId AND EntityType = @entityType AND EntityId = @entityId AND Status = 'aberta';

      IF @existingId IS NOT NULL
      BEGIN
        UPDATE dbo.ComplianceIssues
        SET LastRunId = @runId, Description = @description, Priority = @priority
        WHERE Id = @existingId;

        SELECT @existingId AS Id, 0 AS IsNew;
      END
      ELSE
      BEGIN
        INSERT INTO dbo.ComplianceIssues (
          RuleId, EmployeeId, EntityType, EntityId, EventCode, Priority, Description,
          Status, FirstRunId, LastRunId, DetectedAt
        )
        OUTPUT INSERTED.Id, 1 AS IsNew
        VALUES (
          @ruleId, @employeeId, @entityType, @entityId, @eventCode, @priority, @description,
          'aberta', @runId, @runId, SYSUTCDATETIME()
        );
      END
    `);
  return result.recordset[0];
}

async function updateStatus(id, { status, resolvedBy, resolutionNote }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', id)
    .input('status', status)
    .input('resolvedBy', resolvedBy || null)
    .input('note', resolutionNote || null)
    .query(`
      UPDATE dbo.ComplianceIssues
      SET Status = @status,
          ResolvedBy = @resolvedBy,
          ResolvedAt = SYSUTCDATETIME(),
          ResolutionNote = @note
      WHERE Id = @id;

      SELECT * FROM dbo.ComplianceIssues WHERE Id = @id;
    `);
  return result.recordset[0];
}

/**
 * Fecha como 'corrigida' qualquer inconsistência que estava aberta anteriormente
 * mas que não foi detectada nesta reanálise
 */
async function resolveMissingIssues({ runId, scope, activeIssueIds = [] }) {
  const pool = await poolPromise;
  const request = pool.request();
  request.input('runId', runId);

  let idFilter = '';
  if (activeIssueIds.length > 0) {
    // Lista segura de IDs numéricos
    const idList = activeIssueIds.map(n => parseInt(n, 10)).join(',');
    idFilter = `AND i.Id NOT IN (${idList})`;
  }

  let scopeFilter = '';
  if (scope === 'cadastros') {
    scopeFilter = "AND r.Category IN ('integridade', 'clt')";
  } else if (scope === 'esocial') {
    scopeFilter = "AND r.Category = 'esocial'";
  }

  const result = await request.query(`
    UPDATE i
    SET i.Status = 'corrigida',
        i.ResolvedAt = SYSUTCDATETIME(),
        i.ResolutionNote = 'Não detectada na reanálise (corrigida no sistema)'
    FROM dbo.ComplianceIssues i
    JOIN dbo.ComplianceRules r ON r.Id = i.RuleId
    WHERE i.Status = 'aberta'
      ${scopeFilter}
      ${idFilter};

    SELECT @@ROWCOUNT AS ResolvedCount;
  `);
  return result.recordset[0]?.ResolvedCount || 0;
}

module.exports = {
  list,
  getById,
  upsertIssue,
  updateStatus,
  resolveMissingIssues
};
