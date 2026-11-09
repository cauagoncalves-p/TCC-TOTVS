// backend/src/repositories/alertRepository.js
const { poolPromise } = require('../config/db');
const thresholds = require('../config/thresholds');

/**
 * Lista alertas com filtros opcionais
 * @param {Object} filters { status, risk, departmentId }
 */
async function list({ status, risk, departmentId }) {
  const pool = await poolPromise;
  const request = pool.request();
  const whereClauses = [];

  if (status) {
    request.input('status', status);
    whereClauses.push('a.Status = @status');
  }

  if (risk) {
    request.input('risk', risk);
    whereClauses.push('a.RiskLevel = @risk');
  }

  if (departmentId) {
    request.input('deptId', departmentId);
    whereClauses.push('a.DepartmentId = @deptId');
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Procura se a tabela users tem coluna name
  const query = `
    SELECT
      a.Id,
      a.DepartmentId,
      d.Name AS DepartmentName,
      a.RuleCode,
      a.RiskLevel,
      a.Source,
      CONVERT(VARCHAR(10), a.ReferenceMonth, 120) AS ReferenceMonth,
      a.IndicatorsJson,
      a.Justification,
      a.Recommendation,
      a.Status,
      a.CreatedAt,
      a.UpdatedBy,
      a.UpdatedAt
    FROM dbo.Alerts a
    JOIN dbo.Departments d ON d.Id = a.DepartmentId
    ${whereSql}
    ORDER BY
      CASE a.RiskLevel WHEN 'alto' THEN 1 WHEN 'moderado' THEN 2 ELSE 3 END ASC,
      a.CreatedAt DESC
  `;

  const result = await request.query(query);
  return result.recordset.map(row => ({
    ...row,
    indicators: JSON.parse(row.IndicatorsJson || '{}')
  }));
}

/**
 * Busca alerta por ID
 * @param {number} id
 */
async function getById(id) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', id)
    .query(`
      SELECT
        a.Id,
        a.DepartmentId,
        d.Name AS DepartmentName,
        a.RuleCode,
        a.RiskLevel,
        a.Source,
        CONVERT(VARCHAR(10), a.ReferenceMonth, 120) AS ReferenceMonth,
        a.IndicatorsJson,
        a.Justification,
        a.Recommendation,
        a.Status,
        a.CreatedAt,
        a.UpdatedBy,
        a.UpdatedAt
      FROM dbo.Alerts a
      JOIN dbo.Departments d ON d.Id = a.DepartmentId
      WHERE a.Id = @id
    `);

  const row = result.recordset[0];
  if (!row) return undefined;
  return {
    ...row,
    indicators: JSON.parse(row.IndicatorsJson || '{}')
  };
}

/**
 * Cria um alerta garantindo deduplicação por (DepartmentId, RuleCode, ReferenceMonth)
 * @param {Object} alert
 * @returns {Promise<{created: boolean, id?: number}>}
 */
async function createOrIgnore(alert) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('deptId', alert.departmentId)
    .input('ruleCode', alert.ruleCode)
    .input('riskLevel', alert.riskLevel)
    .input('source', alert.source || 'regra')
    .input('refMonth', alert.referenceMonth)
    .input('indicators', typeof alert.indicatorsJson === 'string' ? alert.indicatorsJson : JSON.stringify(alert.indicatorsJson))
    .input('justification', alert.justification)
    .input('recommendation', alert.recommendation)
    .query(`
      IF NOT EXISTS (
        SELECT 1 FROM dbo.Alerts
        WHERE DepartmentId = @deptId AND RuleCode = @ruleCode AND ReferenceMonth = @refMonth
      )
      BEGIN
        INSERT INTO dbo.Alerts (
          DepartmentId, RuleCode, RiskLevel, Source, ReferenceMonth,
          IndicatorsJson, Justification, Recommendation, Status, CreatedAt
        )
        OUTPUT INSERTED.Id
        VALUES (
          @deptId, @ruleCode, @riskLevel, @source, @refMonth,
          @indicators, @justification, @recommendation, 'novo', SYSUTCDATETIME()
        )
      END
    `);

  if (result.recordset && result.recordset.length > 0) {
    return { created: true, id: result.recordset[0].Id };
  }
  return { created: false };
}

/**
 * Atualiza o status de um alerta ('lido' ou 'resolvido')
 * @param {number} id
 * @param {Object} params { status, updatedBy }
 */
async function updateStatus(id, { status, updatedBy }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', id)
    .input('status', status)
    .input('updatedBy', updatedBy || null)
    .query(`
      UPDATE dbo.Alerts
      SET Status = @status,
          UpdatedBy = @updatedBy,
          UpdatedAt = SYSUTCDATETIME()
      WHERE Id = @id;

      SELECT
        a.Id,
        a.DepartmentId,
        d.Name AS DepartmentName,
        a.RuleCode,
        a.RiskLevel,
        a.Source,
        CONVERT(VARCHAR(10), a.ReferenceMonth, 120) AS ReferenceMonth,
        a.IndicatorsJson,
        a.Justification,
        a.Recommendation,
        a.Status,
        a.CreatedAt,
        a.UpdatedBy,
        a.UpdatedAt
      FROM dbo.Alerts a
      JOIN dbo.Departments d ON d.Id = a.DepartmentId
      WHERE a.Id = @id;
    `);

  const row = result.recordset[0];
  if (!row) return undefined;
  return {
    ...row,
    indicators: JSON.parse(row.IndicatorsJson || '{}')
  };
}

/**
 * Conta alertas ativos ('novo' ou 'lido')
 * @param {Object} filters { departmentId }
 */
async function countActive({ departmentId } = {}) {
  const pool = await poolPromise;
  const request = pool.request();
  let where = "WHERE Status IN ('novo', 'lido')";
  if (departmentId) {
    request.input('deptId', departmentId);
    where += " AND DepartmentId = @deptId";
  }

  const result = await request.query(`
    SELECT COUNT(*) AS ActiveAlerts
    FROM dbo.Alerts
    ${where}
  `);
  return result.recordset[0]?.ActiveAlerts || 0;
}

/**
 * Retorna os departamentos ordenados por concentração de risco (Hotspots)
 * Ponderação de alertas ativos: alto = 3, moderado = 2, baixo = 1
 */
async function getHotspots() {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT
      d.Id AS DepartmentId,
      d.Name AS DepartmentName,
      COUNT(CASE WHEN a.Status IN ('novo', 'lido') THEN 1 END) AS ActiveAlertsCount,
      COUNT(CASE WHEN a.Status IN ('novo', 'lido') AND a.RiskLevel = 'alto' THEN 1 END) AS HighRiskCount,
      COUNT(CASE WHEN a.Status IN ('novo', 'lido') AND a.RiskLevel = 'moderado' THEN 1 END) AS ModerateRiskCount,
      COUNT(CASE WHEN a.Status IN ('novo', 'lido') AND a.RiskLevel = 'baixo' THEN 1 END) AS LowRiskCount,
      /* Score ponderado: alto*3 + moderado*2 + baixo*1 */
      COALESCE(SUM(
        CASE
          WHEN a.Status IN ('novo', 'lido') AND a.RiskLevel = 'alto' THEN 3
          WHEN a.Status IN ('novo', 'lido') AND a.RiskLevel = 'moderado' THEN 2
          WHEN a.Status IN ('novo', 'lido') AND a.RiskLevel = 'baixo' THEN 1
          ELSE 0
        END
      ), 0) AS RiskScore
    FROM dbo.Departments d
    LEFT JOIN dbo.Alerts a ON a.DepartmentId = d.Id
    WHERE d.IsActive = 1
    GROUP BY d.Id, d.Name
    ORDER BY RiskScore DESC, HighRiskCount DESC, d.Name ASC
  `);

  return result.recordset;
}

module.exports = {
  list,
  getById,
  createOrIgnore,
  updateStatus,
  countActive,
  getHotspots
};
