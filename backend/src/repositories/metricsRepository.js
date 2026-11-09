// backend/src/repositories/metricsRepository.js
const { poolPromise } = require('../config/db');

/**
 * Obtém a data do último mês com métricas registradas no banco
 * @returns {Promise<string|null>} Data no formato YYYY-MM-DD
 */
async function getLatestMonth() {
  const pool = await poolPromise;
  const result = await pool.request().query(`
    SELECT CONVERT(VARCHAR(10), MAX(MonthRef), 120) AS LatestMonth
    FROM dbo.DepartmentMonthlyMetrics
  `);
  return result.recordset[0]?.LatestMonth || null;
}

/**
 * Retorna série temporal de métricas com filtros opcionais
 * @param {Object} filters { from, to, departmentId }
 */
async function getTimeseries({ from, to, departmentId }) {
  const pool = await poolPromise;
  const request = pool.request();
  const whereClauses = [];

  if (departmentId) {
    request.input('deptId', departmentId);
    whereClauses.push('m.DepartmentId = @deptId');
  }

  if (from) {
    request.input('from', from);
    whereClauses.push('m.MonthRef >= @from');
  }

  if (to) {
    request.input('to', to);
    whereClauses.push('m.MonthRef <= @to');
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const query = `
    SELECT
      m.Id,
      m.DepartmentId,
      d.Name AS DepartmentName,
      CONVERT(VARCHAR(10), m.MonthRef, 120) AS MonthRef,
      m.Headcount,
      m.WorkDays,
      CAST(m.AbsenceDays AS FLOAT) AS AbsenceDays,
      CAST(m.OvertimeHours AS FLOAT) AS OvertimeHours,
      m.Hires,
      m.Terminations,
      CAST(m.AbsenceRate AS FLOAT) AS AbsenceRate,
      CAST(m.OvertimePerEmployee AS FLOAT) AS OvertimePerEmployee,
      CAST(m.TurnoverRate AS FLOAT) AS TurnoverRate
    FROM dbo.DepartmentMonthlyMetrics m
    JOIN dbo.Departments d ON d.Id = m.DepartmentId
    ${whereSql}
    ORDER BY m.MonthRef ASC, d.Name ASC
  `;

  const result = await request.query(query);
  return result.recordset;
}

/**
 * Retorna o comparativo de todos os departamentos em um mês específico
 * @param {string} monthRef - 'YYYY-MM-01'
 */
async function getByDepartmentForMonth(monthRef) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('monthRef', monthRef)
    .query(`
      SELECT
        m.DepartmentId,
        d.Name AS DepartmentName,
        CONVERT(VARCHAR(10), m.MonthRef, 120) AS MonthRef,
        m.Headcount,
        m.WorkDays,
        CAST(m.AbsenceDays AS FLOAT) AS AbsenceDays,
        CAST(m.OvertimeHours AS FLOAT) AS OvertimeHours,
        m.Hires,
        m.Terminations,
        CAST(m.AbsenceRate AS FLOAT) AS AbsenceRate,
        CAST(m.OvertimePerEmployee AS FLOAT) AS OvertimePerEmployee,
        CAST(m.TurnoverRate AS FLOAT) AS TurnoverRate
      FROM dbo.DepartmentMonthlyMetrics m
      JOIN dbo.Departments d ON d.Id = m.DepartmentId
      WHERE m.MonthRef = @monthRef
      ORDER BY d.Name ASC
    `);
  return result.recordset;
}

/**
 * Retorna as médias ponderadas e agregadas para o período especificado
 * @param {Object} filters { from, to, departmentId }
 */
async function getPeriodAggregates({ from, to, departmentId }) {
  const pool = await poolPromise;
  const request = pool.request();
  const whereClauses = [];

  if (departmentId) {
    request.input('deptId', departmentId);
    whereClauses.push('DepartmentId = @deptId');
  }

  if (from) {
    request.input('from', from);
    whereClauses.push('MonthRef >= @from');
  }

  if (to) {
    request.input('to', to);
    whereClauses.push('MonthRef <= @to');
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const query = `
    SELECT
      COUNT(DISTINCT MonthRef) AS MonthsCount,
      AVG(Headcount) AS AvgHeadcount,
      SUM(AbsenceDays) AS TotalAbsenceDays,
      SUM(OvertimeHours) AS TotalOvertimeHours,
      SUM(Hires) AS TotalHires,
      SUM(Terminations) AS TotalTerminations,
      /* Média ponderada oficial de absenteísmo no período */
      CAST(SUM(AbsenceDays) * 100.0 / NULLIF(SUM(Headcount * WorkDays), 0) AS DECIMAL(6,2)) AS WeightedAbsenceRate,
      /* Média de horas extras por colaborador no período */
      CAST(SUM(OvertimeHours) / NULLIF(SUM(Headcount), 0) AS DECIMAL(8,2)) AS WeightedOvertimePerEmployee,
      /* Média ponderada de turnover no período */
      CAST(SUM(Terminations) * 100.0 / NULLIF(SUM(Headcount), 0) AS DECIMAL(6,2)) AS WeightedTurnoverRate
    FROM dbo.DepartmentMonthlyMetrics
    ${whereSql}
  `;

  const result = await request.query(query);
  const row = result.recordset[0];
  return {
    monthsCount: row?.MonthsCount || 0,
    avgHeadcount: row?.AvgHeadcount || 0,
    totalAbsenceDays: Number(row?.TotalAbsenceDays || 0),
    totalOvertimeHours: Number(row?.TotalOvertimeHours || 0),
    totalHires: row?.TotalHires || 0,
    totalTerminations: row?.TotalTerminations || 0,
    absenceRate: Number(row?.WeightedAbsenceRate || 0),
    overtimePerEmployee: Number(row?.WeightedOvertimePerEmployee || 0),
    turnoverRate: Number(row?.WeightedTurnoverRate || 0)
  };
}

/**
 * Retorna o histórico recente de todos os departamentos (para o motor de regras)
 * @param {number} monthsCount
 * @param {string} [upToMonth]
 */
async function getAllDepartmentsHistory(monthsCount = 6, upToMonth = null) {
  const pool = await poolPromise;
  const request = pool.request();
  request.input('limit', monthsCount);

  let upToSql = '';
  if (upToMonth) {
    request.input('upToMonth', upToMonth);
    upToSql = 'AND MonthRef <= @upToMonth';
  }

  // Busca os últimos `monthsCount` meses distintos
  const queryMonths = `
    SELECT DISTINCT TOP (@limit) MonthRef
    FROM dbo.DepartmentMonthlyMetrics
    WHERE 1=1 ${upToSql}
    ORDER BY MonthRef DESC
  `;
  const resMonths = await request.query(queryMonths);
  const targetMonths = resMonths.recordset.map(r => r.MonthRef);

  if (targetMonths.length === 0) return [];

  const req2 = pool.request();
  const minMonth = targetMonths[targetMonths.length - 1];
  const maxMonth = targetMonths[0];
  req2.input('minMonth', minMonth);
  req2.input('maxMonth', maxMonth);

  const query = `
    SELECT
      m.DepartmentId,
      d.Name AS DepartmentName,
      CONVERT(VARCHAR(10), m.MonthRef, 120) AS MonthRef,
      m.Headcount,
      m.WorkDays,
      CAST(m.AbsenceDays AS FLOAT) AS AbsenceDays,
      CAST(m.OvertimeHours AS FLOAT) AS OvertimeHours,
      m.Hires,
      m.Terminations,
      CAST(m.AbsenceRate AS FLOAT) AS AbsenceRate,
      CAST(m.OvertimePerEmployee AS FLOAT) AS OvertimePerEmployee,
      CAST(m.TurnoverRate AS FLOAT) AS TurnoverRate
    FROM dbo.DepartmentMonthlyMetrics m
    JOIN dbo.Departments d ON d.Id = m.DepartmentId
    WHERE m.MonthRef BETWEEN @minMonth AND @maxMonth
    ORDER BY m.DepartmentId ASC, m.MonthRef ASC
  `;

  const result = await req2.query(query);
  return result.recordset;
}

/**
 * Retorna as médias da empresa em um determinado mês
 * @param {string} monthRef - 'YYYY-MM-01'
 */
async function getCompanyAveragesForMonth(monthRef) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('monthRef', monthRef)
    .query(`
      SELECT
        AVG(CAST(AbsenceRate AS FLOAT)) AS AvgAbsenceRate,
        AVG(CAST(OvertimePerEmployee AS FLOAT)) AS AvgOvertimePerEmployee,
        AVG(CAST(TurnoverRate AS FLOAT)) AS AvgTurnoverRate
      FROM dbo.DepartmentMonthlyMetrics
      WHERE MonthRef = @monthRef
    `);
  const row = result.recordset[0];
  return {
    avgAbsenceRate: Number(row?.AvgAbsenceRate || 0),
    avgOvertimePerEmployee: Number(row?.AvgOvertimePerEmployee || 0),
    avgTurnoverRate: Number(row?.AvgTurnoverRate || 0)
  };
}

module.exports = {
  getLatestMonth,
  getTimeseries,
  getByDepartmentForMonth,
  getPeriodAggregates,
  getAllDepartmentsHistory,
  getCompanyAveragesForMonth
};
