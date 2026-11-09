// backend/src/services/analyticsService.js
const departmentRepository = require('../repositories/departmentRepository');
const metricsRepository = require('../repositories/metricsRepository');
const alertRepository = require('../repositories/alertRepository');

/**
 * Retorna lista de departamentos ativos
 */
async function getDepartments() {
  return await departmentRepository.listActive();
}

/**
 * Calcula datas do período anterior equivalente para cálculo de variações (deltas)
 */
function getPreviousPeriodDates(fromStr, toStr) {
  if (!fromStr || !toStr) return null;
  const from = new Date(fromStr + 'T00:00:00Z');
  const to = new Date(toStr + 'T00:00:00Z');
  const diffTime = Math.abs(to - from);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const prevTo = new Date(from);
  prevTo.setUTCDate(prevTo.getUTCDate() - 1);

  const prevFrom = new Date(prevTo);
  prevFrom.setUTCDate(prevFrom.getUTCDate() - diffDays);

  return {
    fromPrev: prevFrom.toISOString().split('T')[0],
    toPrev: prevTo.toISOString().split('T')[0]
  };
}

/**
 * Retorna os cards de resumo para o dashboard com variação vs. período anterior
 * @param {Object} params { from, to, departmentId }
 */
async function getSummary({ from, to, departmentId }) {
  const latestMonth = await metricsRepository.getLatestMonth();

  // Período padrão: últimos 12 meses até o último mês fechado
  let fromDate = from;
  let toDate = to || latestMonth;

  if (!fromDate && toDate) {
    const d = new Date(toDate + 'T00:00:00Z');
    d.setUTCMonth(d.getUTCMonth() - 11);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    fromDate = `${y}-${m}-01`;
  }

  // 1. Agregados do período atual
  const currentAgg = await metricsRepository.getPeriodAggregates({
    from: fromDate,
    to: toDate,
    departmentId
  });

  // 2. Alertas ativos no departamento/geral
  const activeAlerts = await alertRepository.countActive({ departmentId });

  // 3. Período anterior para cálculo de variação
  let deltas = {
    absenceRateDelta: null,
    overtimeDelta: null,
    turnoverDelta: null
  };

  const prevPeriod = getPreviousPeriodDates(fromDate, toDate);
  if (prevPeriod) {
    const prevAgg = await metricsRepository.getPeriodAggregates({
      from: prevPeriod.fromPrev,
      to: prevPeriod.toPrev,
      departmentId
    });

    if (prevAgg.monthsCount > 0) {
      deltas = {
        absenceRateDelta: Number((currentAgg.absenceRate - prevAgg.absenceRate).toFixed(2)),
        overtimeDelta: Number((currentAgg.overtimePerEmployee - prevAgg.overtimePerEmployee).toFixed(2)),
        turnoverDelta: Number((currentAgg.turnoverRate - prevAgg.turnoverRate).toFixed(2))
      };
    }
  }

  return {
    period: {
      from: fromDate,
      to: toDate,
      monthsCount: currentAgg.monthsCount
    },
    departmentId: departmentId ? Number(departmentId) : null,
    cards: {
      absenceRate: {
        value: currentAgg.absenceRate,
        unit: '%',
        delta: deltas.absenceRateDelta
      },
      overtimePerEmployee: {
        value: currentAgg.overtimePerEmployee,
        unit: 'h/colaborador',
        delta: deltas.overtimeDelta
      },
      turnoverRate: {
        value: currentAgg.turnoverRate,
        unit: '%',
        delta: deltas.turnoverDelta
      },
      activeAlerts: {
        value: activeAlerts,
        unit: 'alertas'
      }
    },
    totals: {
      avgHeadcount: currentAgg.avgHeadcount,
      totalAbsenceDays: currentAgg.totalAbsenceDays,
      totalOvertimeHours: currentAgg.totalOvertimeHours,
      totalHires: currentAgg.totalHires,
      totalTerminations: currentAgg.totalTerminations
    }
  };
}

/**
 * Retorna a série temporal dos 3 indicadores para o gráfico de evolução
 * @param {Object} params { from, to, departmentId }
 */
async function getTimeseries({ from, to, departmentId }) {
  const latestMonth = await metricsRepository.getLatestMonth();

  // Padrão: 12 meses até o último mês
  let fromDate = from;
  let toDate = to || latestMonth;

  if (!fromDate && toDate) {
    const d = new Date(toDate + 'T00:00:00Z');
    d.setUTCMonth(d.getUTCMonth() - 11);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    fromDate = `${y}-${m}-01`;
  }

  return await metricsRepository.getTimeseries({
    from: fromDate,
    to: toDate,
    departmentId
  });
}

/**
 * Retorna o comparativo entre todos os departamentos em um mês específico
 * @param {string} [month] - 'YYYY-MM-01'
 */
async function getByDepartment(month = null) {
  const targetMonth = month || await metricsRepository.getLatestMonth();
  if (!targetMonth) return [];
  return await metricsRepository.getByDepartmentForMonth(targetMonth);
}

/**
 * Retorna o ranking de concentração de risco (Hotspots)
 */
async function getHotspots() {
  return await alertRepository.getHotspots();
}

module.exports = {
  getDepartments,
  getSummary,
  getTimeseries,
  getByDepartment,
  getHotspots
};
