// backend/src/services/riskRulesService.js
const thresholds = require('../config/thresholds');
const metricsRepository = require('../repositories/metricsRepository');
const alertRepository = require('../repositories/alertRepository');

/**
 * Avalia a regra ABS_OT_UP:
 * Absenteísmo e horas extras crescendo juntos por 3 meses seguidos.
 * Risco moderado; alto se ambos ficarem 20% acima da média da empresa.
 */
function evaluateAbsOtUp(history, companyAvg) {
  if (history.length < 4) return null;

  const m0 = history[history.length - 1];
  const m1 = history[history.length - 2];
  const m2 = history[history.length - 3];
  const m3 = history[history.length - 4];

  // Verifica crescimento simultâneo em 3 transições consecutivas (m3 -> m2 -> m1 -> m0)
  const absGrowing = (m0.AbsenceRate > m1.AbsenceRate) &&
                     (m1.AbsenceRate > m2.AbsenceRate) &&
                     (m2.AbsenceRate > m3.AbsenceRate);

  const otGrowing = (m0.OvertimePerEmployee > m1.OvertimePerEmployee) &&
                    (m1.OvertimePerEmployee > m2.OvertimePerEmployee) &&
                    (m2.OvertimePerEmployee > m3.OvertimePerEmployee);

  if (!absGrowing || !otGrowing) return null;

  // Avalia se ambos estão 20% acima da média da empresa
  const ratio = thresholds.COMPANY_AVERAGE_SURPASS_RATIO;
  const isHighRisk = (m0.AbsenceRate >= companyAvg.avgAbsenceRate * ratio) &&
                     (m0.OvertimePerEmployee >= companyAvg.avgOvertimePerEmployee * ratio);

  const riskLevel = isHighRisk ? 'alto' : 'moderado';

  let justification = `Absenteísmo (${m0.AbsenceRate.toFixed(1)}%) e horas extras (${m0.OvertimePerEmployee.toFixed(1)}h/colaborador) cresceram simultaneamente nos últimos 3 meses consecutivos.`;
  if (isHighRisk) {
    justification += ` Ambos os indicadores ultrapassaram em mais de 20% a média da empresa (absenteísmo médio: ${companyAvg.avgAbsenceRate.toFixed(1)}%, HE média: ${companyAvg.avgOvertimePerEmployee.toFixed(1)}h).`;
  }

  return {
    departmentId: m0.DepartmentId,
    ruleCode: 'ABS_OT_UP',
    riskLevel,
    source: 'regra',
    referenceMonth: m0.MonthRef,
    indicatorsJson: {
      currentAbsenceRate: m0.AbsenceRate,
      previousAbsenceRate: m1.AbsenceRate,
      currentOvertime: m0.OvertimePerEmployee,
      previousOvertime: m1.OvertimePerEmployee,
      companyAvgAbsence: companyAvg.avgAbsenceRate,
      companyAvgOvertime: companyAvg.avgOvertimePerEmployee
    },
    justification,
    recommendation: 'Investigar causas imediatas do absenteísmo, avaliar sobrecarga nas escalas de trabalho e providenciar reforço temporário ou redistribuição de atividades críticas.'
  };
}

/**
 * Avalia a regra OT_CHRONIC:
 * Horas extras por colaborador acima do limite em 3 dos últimos 4 meses.
 * Risco: moderado.
 */
function evaluateOtChronic(history) {
  if (history.length < 4) return null;

  const last4 = history.slice(-4);
  const m0 = last4[last4.length - 1];
  const limit = thresholds.CHRONIC_OVERTIME_HOURS_PER_EMPLOYEE;

  const monthsAbove = last4.filter(m => m.OvertimePerEmployee >= limit);

  if (monthsAbove.length >= 3) {
    const avgRecentOt = last4.reduce((acc, m) => acc + m.OvertimePerEmployee, 0) / last4.length;

    return {
      departmentId: m0.DepartmentId,
      ruleCode: 'OT_CHRONIC',
      riskLevel: 'moderado',
      source: 'regra',
      referenceMonth: m0.MonthRef,
      indicatorsJson: {
        limitHours: limit,
        monthsAboveCount: monthsAbove.length,
        recentMonthsOvertime: last4.map(m => ({ month: m.MonthRef, overtime: m.OvertimePerEmployee })),
        avgRecentOvertime: Number(avgRecentOt.toFixed(2))
      },
      justification: `Horas extras crônicas: o limite de ${limit}h/colaborador foi excedido em ${monthsAbove.length} dos últimos 4 meses (média recente: ${avgRecentOt.toFixed(1)}h/colaborador).`,
      recommendation: 'Reavaliar o dimensionamento do quadro, mapear gargalos operacionais e revisar processos para mitigar fadiga crônica da equipe e passivo trabalhista.'
    };
  }

  return null;
}

/**
 * Avalia a regra ABS_LEADS_TURNOVER:
 * Absenteísmo 30% acima da média dos 3 meses anteriores, seguido de alta no turnover.
 * Risco: alto.
 */
function evaluateAbsLeadsTurnover(history) {
  if (history.length < 5) return null;

  const m0 = history[history.length - 1]; // mês atual

  // Verifica se houve pico de absenteísmo em m-1 ou m-2
  for (let offset = 1; offset <= 2; offset++) {
    const spikeIdx = history.length - 1 - offset;
    const spikeMonth = history[spikeIdx];

    if (spikeIdx < 3) continue;

    const baselineMonths = history.slice(spikeIdx - 3, spikeIdx);
    const baselineAbsAvg = baselineMonths.reduce((acc, m) => acc + m.AbsenceRate, 0) / 3;

    const hadAbsenceSpike = spikeMonth.AbsenceRate >= (baselineAbsAvg * thresholds.ABSENCE_SPIKE_RATIO) &&
                            spikeMonth.AbsenceRate >= 3.0;

    if (hadAbsenceSpike) {
      // Verifica se no mês atual (ou desde o pico) o turnover aumentou expressivamente
      const baselineTurnoverAvg = baselineMonths.reduce((acc, m) => acc + m.TurnoverRate, 0) / 3;
      const turnoverSpiked = (m0.TurnoverRate >= thresholds.TURNOVER_HIGH_RATE) ||
                             (m0.TurnoverRate >= baselineTurnoverAvg * thresholds.TURNOVER_SPIKE_RATIO && m0.TurnoverRate >= 3.0);

      if (turnoverSpiked) {
        return {
          departmentId: m0.DepartmentId,
          ruleCode: 'ABS_LEADS_TURNOVER',
          riskLevel: 'alto',
          source: 'regra',
          referenceMonth: m0.MonthRef,
          indicatorsJson: {
            spikeMonth: spikeMonth.MonthRef,
            spikeAbsenceRate: spikeMonth.AbsenceRate,
            baselineAbsenceRate: Number(baselineAbsAvg.toFixed(2)),
            currentTurnoverRate: m0.TurnoverRate,
            baselineTurnoverRate: Number(baselineTurnoverAvg.toFixed(2))
          },
          justification: `Salto no absenteísmo em ${spikeMonth.MonthRef} (${spikeMonth.AbsenceRate.toFixed(1)}% vs. base de ${baselineAbsAvg.toFixed(1)}%) foi sucedido por elevação severa no turnover (${m0.TurnoverRate.toFixed(1)}%). O absenteísmo atuou como indicador antecedente de evasão.`,
          recommendation: 'Ações imediatas de retenção de talentos: realizar entrevistas de permanência (stay interviews), apurar causas de desengajamento e avaliar remuneração e liderança direta.'
        };
      }
    }
  }

  return null;
}

/**
 * Avalia a regra TRIPLE_RISK:
 * Faltas, horas extras e turnover subindo no mesmo trimestre.
 * Risco: alto.
 */
function evaluateTripleRisk(history) {
  if (history.length < 3) return null;

  const m0 = history[history.length - 1]; // mês atual
  const m2 = history[history.length - 3]; // 2 meses atrás (início do trimestre)

  // Verifica se todos os 3 indicadores subiram do início para o final do trimestre
  const absUp = m0.AbsenceRate > m2.AbsenceRate;
  const otUp = m0.OvertimePerEmployee > m2.OvertimePerEmployee;
  const turnoverUp = m0.TurnoverRate > m2.TurnoverRate;

  if (absUp && otUp && turnoverUp && (m0.AbsenceRate >= 3.0 || m0.TurnoverRate >= 3.0)) {
    return {
      departmentId: m0.DepartmentId,
      ruleCode: 'TRIPLE_RISK',
      riskLevel: 'alto',
      source: 'regra',
      referenceMonth: m0.MonthRef,
      indicatorsJson: {
        quarterStartMonth: m2.MonthRef,
        quarterEndMonth: m0.MonthRef,
        absenceDelta: Number((m0.AbsenceRate - m2.AbsenceRate).toFixed(2)),
        overtimeDelta: Number((m0.OvertimePerEmployee - m2.OvertimePerEmployee).toFixed(2)),
        turnoverDelta: Number((m0.TurnoverRate - m2.TurnoverRate).toFixed(2)),
        currentMetrics: {
          absenceRate: m0.AbsenceRate,
          overtimePerEmployee: m0.OvertimePerEmployee,
          turnoverRate: m0.TurnoverRate
        }
      },
      justification: `Tríplice alta no trimestre: absenteísmo (+${(m0.AbsenceRate - m2.AbsenceRate).toFixed(1)}%), horas extras (+${(m0.OvertimePerEmployee - m2.OvertimePerEmployee).toFixed(1)}h) e turnover (+${(m0.TurnoverRate - m2.TurnoverRate).toFixed(1)}%) subiram simultaneamente, indicando estresse operacional crítico.`,
      recommendation: 'Alinhamento prioritário entre a diretoria e a liderança do setor para estancar desligamentos, rever metas e redistribuir a carga de trabalho emergencialmente.'
    };
  }

  return null;
}

/**
 * Executa o motor de regras para todos os departamentos e persiste os alertas gerados
 * @param {string} [referenceMonth]
 * @returns {Promise<{evaluated: number, generated: number, alerts: Array}>}
 */
async function evaluateAll(referenceMonth = null) {
  const latest = referenceMonth || await metricsRepository.getLatestMonth();
  if (!latest) {
    return { evaluated: 0, generated: 0, alerts: [] };
  }

  // 1. Histórico de métricas de todos os departamentos (últimos 6 meses)
  const allHistory = await metricsRepository.getAllDepartmentsHistory(6, latest);

  // 2. Médias da empresa no mês de referência
  const companyAvg = await metricsRepository.getCompanyAveragesForMonth(latest);

  // Agrupa histórico por DepartmentId
  const historyByDept = {};
  for (const row of allHistory) {
    if (!historyByDept[row.DepartmentId]) {
      historyByDept[row.DepartmentId] = [];
    }
    historyByDept[row.DepartmentId].push(row);
  }

  const generatedAlerts = [];
  let evaluatedCount = 0;

  for (const [deptIdStr, history] of Object.entries(historyByDept)) {
    evaluatedCount++;
    const candidates = [
      evaluateAbsOtUp(history, companyAvg),
      evaluateOtChronic(history),
      evaluateAbsLeadsTurnover(history),
      evaluateTripleRisk(history)
    ].filter(Boolean);

    for (const candidate of candidates) {
      const res = await alertRepository.createOrIgnore(candidate);
      if (res.created) {
        generatedAlerts.push({ id: res.id, ...candidate });
      }
    }
  }

  return {
    referenceMonth: latest,
    departmentsEvaluated: evaluatedCount,
    newAlertsGenerated: generatedAlerts.length,
    alerts: generatedAlerts
  };
}

module.exports = {
  evaluateAbsOtUp,
  evaluateOtChronic,
  evaluateAbsLeadsTurnover,
  evaluateTripleRisk,
  evaluateAll
};
