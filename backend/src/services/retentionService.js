// backend/src/services/retentionService.js
const retentionConfig = require('../config/retentionScore');
const retentionRepository = require('../repositories/retentionRepository');

/**
 * Calcula a mediana de um array de números
 */
function calculateMedian(values) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Formata mês no formato YYYY-MM-01
 */
function formatMonthKey(date) {
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/**
 * Retorna as janelas de meses fechados a partir de uma data de referência
 */
function getEvaluationWindows(referenceDate) {
  const ref = new Date(referenceDate);
  const curMonth = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1));

  const recentMonthKeys = [];
  for (let k = 1; k <= 3; k++) {
    const d = new Date(curMonth);
    d.setUTCMonth(curMonth.getUTCMonth() - k);
    recentMonthKeys.push(formatMonthKey(d));
  }

  const previousMonthKeys = [];
  for (let k = 4; k <= 6; k++) {
    const d = new Date(curMonth);
    d.setUTCMonth(curMonth.getUTCMonth() - k);
    previousMonthKeys.push(formatMonthKey(d));
  }

  return {
    referenceDate: ref,
    lastClosedMonthKey: recentMonthKeys[0],
    recentMonthKeys,   // [M-1, M-2, M-3]
    previousMonthKeys  // [M-4, M-5, M-6]
  };
}

/**
 * Motor central de cálculo do índice de atenção (regras-v1)
 */
async function computeRetentionAttentionIndex({ departmentId } = {}) {
  const [departments, referenceDate, careerEventsList, attendanceList] = await Promise.all([
    retentionRepository.getDepartments(),
    retentionRepository.getReferenceDate(),
    retentionRepository.getLatestCareerEvents(),
    // 8 meses atrás para cobrir com folga as janelas M-1 a M-6
    retentionRepository.getAttendanceHistory(new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 8, 1)))
  ]);

  // Carrega todos os colaboradores ativos para que o cálculo das medianas departamentais
  // seja fiel ao departamento inteiro, mesmo se filtrando por departamento depois.
  const allActiveEmployees = await retentionRepository.getActiveEmployees();

  const windows = getEvaluationWindows(referenceDate);

  // Mapeia eventos de carreira por EmployeeId
  const careerMap = new Map();
  careerEventsList.forEach(c => {
    careerMap.set(c.EmployeeId, c);
  });

  // Mapeia registros de frequência por `${EmployeeId}_${MonthRef}`
  const attendanceMap = new Map();
  attendanceList.forEach(a => {
    const mKey = formatMonthKey(a.MonthRef);
    attendanceMap.set(`${a.EmployeeId}_${mKey}`, a);
  });

  // 1. Extração de métricas trimestrais por colaborador
  const employeeMetricsMap = new Map();

  allActiveEmployees.forEach(emp => {
    const recentRecords = [];
    windows.recentMonthKeys.forEach(mKey => {
      const rec = attendanceMap.get(`${emp.Id}_${mKey}`);
      if (rec) recentRecords.push(rec);
    });

    const previousRecords = [];
    windows.previousMonthKeys.forEach(mKey => {
      const rec = attendanceMap.get(`${emp.Id}_${mKey}`);
      if (rec) previousRecords.push(rec);
    });

    const recentAbsences = recentRecords.reduce((sum, r) => sum + r.AbsenceDays, 0);
    const recentOvertimeSum = recentRecords.reduce((sum, r) => sum + r.OvertimeHours, 0);
    const avgRecentOvertime = recentRecords.length > 0 ? (recentOvertimeSum / recentRecords.length) : 0;

    const previousAbsences = previousRecords.reduce((sum, r) => sum + r.AbsenceDays, 0);
    const previousOvertimeSum = previousRecords.reduce((sum, r) => sum + r.OvertimeHours, 0);
    const avgPreviousOvertime = previousRecords.length > 0 ? (previousOvertimeSum / previousRecords.length) : 0;

    const lastClosedRec = attendanceMap.get(`${emp.Id}_${windows.lastClosedMonthKey}`);
    const lastMonthAbsences = lastClosedRec ? lastClosedRec.AbsenceDays : 0;

    employeeMetricsMap.set(emp.Id, {
      recentRecords,
      previousRecords,
      recentAbsences,
      avgRecentOvertime,
      previousAbsences,
      avgPreviousOvertime,
      lastMonthAbsences
    });
  });

  // 2. Cálculo das medianas por departamento
  const deptMediansMap = new Map();

  departments.forEach(dept => {
    const deptEmployees = allActiveEmployees.filter(e => e.Department === dept.Name && e.ContractType !== 'aprendiz');
    const otList = [];
    const absList = [];

    deptEmployees.forEach(e => {
      const m = employeeMetricsMap.get(e.Id);
      if (m && m.recentRecords.length > 0) {
        otList.push(m.avgRecentOvertime);
        absList.push(m.recentAbsences);
      }
    });

    const medOt = calculateMedian(otList);
    const medAbs = calculateMedian(absList);

    deptMediansMap.set(dept.Name, {
      medianOvertime: medOt > 0 ? medOt : 1.0,
      medianAbsences: medAbs > 0 ? medAbs : 1.0
    });
  });

  // 3. Avaliação individual conforme regras-v1
  const scoredEmployees = allActiveEmployees.map(emp => {
    const m = employeeMetricsMap.get(emp.Id);
    const career = careerMap.get(emp.Id);
    const deptMed = deptMediansMap.get(emp.Department) || { medianOvertime: 1.0, medianAbsences: 1.0 };

    const hireDate = new Date(emp.HireDate);
    const tenureDays = Math.max(0, Math.floor((windows.referenceDate - hireDate) / (1000 * 60 * 60 * 24)));
    const tenureMonths = Math.floor(tenureDays / 30.4375);

    // Casos especiais: Aprendizes e dados insuficientes
    if (emp.ContractType === 'aprendiz') {
      return {
        id: emp.Id,
        fullName: emp.FullName,
        registration: emp.Registration,
        department: emp.Department,
        departmentId: emp.DepartmentId,
        jobTitle: emp.JobTitle,
        contractType: emp.ContractType,
        tenureMonths,
        lastMonthAbsences: m.lastMonthAbsences,
        recentAbsences: m.recentAbsences,
        avgRecentOvertime: Number(m.avgRecentOvertime.toFixed(1)),
        monthsSinceLastMovement: 0,
        vacationBalanceDays: emp.VacationBalanceDays || 0,
        score: null,
        level: 'nao_aplicavel',
        levelLabel: 'Não aplicável',
        dataQuality: 'insuficiente',
        signals: ['Aprendiz: fora do índice de atenção'],
        trend: 'estavel',
        components: null
      };
    }

    const validRecent = m.recentRecords.length;
    const validPrevious = m.previousRecords.length;
    const totalValid = validRecent + validPrevious;

    if (tenureDays < retentionConfig.windows.minTenureDays || totalValid < retentionConfig.windows.minValidMonths) {
      return {
        id: emp.Id,
        fullName: emp.FullName,
        registration: emp.Registration,
        department: emp.Department,
        departmentId: emp.DepartmentId,
        jobTitle: emp.JobTitle,
        contractType: emp.ContractType,
        tenureMonths,
        lastMonthAbsences: m.lastMonthAbsences,
        recentAbsences: m.recentAbsences,
        avgRecentOvertime: Number(m.avgRecentOvertime.toFixed(1)),
        monthsSinceLastMovement: 0,
        vacationBalanceDays: emp.VacationBalanceDays || 0,
        score: null,
        level: 'insuficiente',
        levelLabel: 'Dados insuficientes',
        dataQuality: 'insuficiente',
        signals: ['Admitido há menos de 90 dias ou histórico reduzido'],
        trend: 'estavel',
        components: null
      };
    }

    // Qualidade dos dados
    let dataQuality = 'parcial';
    if (validRecent === 3 && validPrevious === 3) {
      dataQuality = 'completo';
    }

    // --- Componente 1: Sobrecarga (máx 40 pts) ---
    const otRatio = m.avgRecentOvertime / deptMed.medianOvertime;
    let scoreOt = 0;
    if (otRatio >= 2.0) {
      scoreOt = 40;
    } else if (otRatio > 1.0) {
      scoreOt = Math.round((otRatio - 1.0) * 40);
    }
    const phraseOt = `Horas extras: média de ${m.avgRecentOvertime.toFixed(1)} h nos últimos 3 meses; mediana do departamento: ${deptMed.medianOvertime.toFixed(1)} h`;

    // --- Componente 2: Ausências (máx 40 pts = 25 pts nível + 15 pts crescimento) ---
    // Nível (25 pts)
    const absRatio = m.recentAbsences / deptMed.medianAbsences;
    let scoreAbsLevel = 0;
    if (absRatio >= 3.0) {
      scoreAbsLevel = 25;
    } else if (absRatio > 1.0) {
      scoreAbsLevel = ((absRatio - 1.0) / 2.0) * 25;
    }

    // Crescimento (15 pts)
    let scoreAbsGrowth = 0;
    let growthRate = 0;
    if (m.previousAbsences === 0) {
      if (m.recentAbsences > 0) {
        growthRate = 1.0;
        scoreAbsGrowth = 15;
      }
    } else {
      growthRate = (m.recentAbsences - m.previousAbsences) / m.previousAbsences;
      if (growthRate >= 1.0) {
        scoreAbsGrowth = 15;
      } else if (growthRate > 0) {
        scoreAbsGrowth = growthRate * 15;
      }
    }
    const scoreAbs = Math.min(40, Math.round(scoreAbsLevel + scoreAbsGrowth));
    const growthDisplay = Math.round(growthRate * 100);
    const phraseAbs = `Ausências: ${m.recentAbsences.toFixed(1)} dias nos últimos 3 meses (mediana do setor: ${deptMed.medianAbsences.toFixed(1)} dias); crescimento de ${growthDisplay > 0 ? '+' : ''}${growthDisplay}% em relação ao trimestre anterior`;

    // --- Componente 3: Estagnação (máx 20 pts) ---
    const lastEventDate = career ? new Date(career.EventDate) : hireDate;
    const monthsSinceLastMovement = Math.max(0, Math.floor((windows.referenceDate - lastEventDate) / (1000 * 60 * 60 * 24 * 30.4375)));
    let scoreStag = 0;
    if (monthsSinceLastMovement >= 30) {
      scoreStag = 20;
    } else if (monthsSinceLastMovement > 12) {
      scoreStag = Math.round(((monthsSinceLastMovement - 12) / 18) * 20);
    }
    const eventName = career ? (career.EventType === 'admissao' ? 'admissão' : career.EventType) : 'admissão';
    const phraseStag = `Última movimentação de carreira há ${monthsSinceLastMovement} meses (${eventName})`;

    // Pontuação final
    const totalScore = Math.min(100, Math.round(scoreOt + scoreAbs + scoreStag));

    let level = 'baixa';
    let levelLabel = 'Baixa';
    if (totalScore >= retentionConfig.thresholds.highMin) {
      level = 'alta';
      levelLabel = 'Alta';
    } else if (totalScore >= retentionConfig.thresholds.moderateMin) {
      level = 'moderada';
      levelLabel = 'Moderada';
    }

    // Sinais explicativos (até 3 etiquetas)
    const signals = [];
    if (scoreOt >= 20 || m.avgRecentOvertime >= deptMed.medianOvertime * 1.3) {
      signals.push('Horas extras acima do setor');
    }
    if (scoreAbsGrowth >= 7.5 || growthRate >= 0.3) {
      signals.push('Faltas em alta');
    }
    if (scoreAbsLevel >= 15 || absRatio >= 1.5) {
      signals.push('Ausências acima do setor');
    }
    if (monthsSinceLastMovement >= 24) {
      signals.push('Sem movimentação há mais de 2 anos');
    } else if (monthsSinceLastMovement >= 18) {
      signals.push('Sem movimentação há mais de 1 ano e meio');
    }
    if ((emp.VacationBalanceDays || 0) >= 30) {
      signals.push('Férias acumuladas');
    }

    // Tendência trimestral
    const currentLoad = m.recentAbsences + m.avgRecentOvertime;
    const previousLoad = m.previousAbsences + m.avgPreviousOvertime;
    let trend = 'estavel';
    if (previousLoad > 0) {
      const loadChange = (currentLoad - previousLoad) / previousLoad;
      if (loadChange > 0.15) trend = 'subindo';
      else if (loadChange < -0.15) trend = 'caindo';
    } else if (currentLoad > 0) {
      trend = 'subindo';
    }

    return {
      id: emp.Id,
      fullName: emp.FullName,
      registration: emp.Registration,
      department: emp.Department,
      departmentId: emp.DepartmentId,
      jobTitle: emp.JobTitle,
      contractType: emp.ContractType,
      tenureMonths,
      lastMonthAbsences: m.lastMonthAbsences,
      recentAbsences: m.recentAbsences,
      avgRecentOvertime: Number(m.avgRecentOvertime.toFixed(1)),
      monthsSinceLastMovement,
      vacationBalanceDays: emp.VacationBalanceDays || 0,
      score: totalScore,
      level,
      levelLabel,
      dataQuality,
      signals: signals.slice(0, 3),
      trend,
      components: {
        sobrecarga: {
          points: scoreOt,
          maxPoints: retentionConfig.components.overtime.maxPoints,
          phrase: phraseOt
        },
        ausencias: {
          points: scoreAbs,
          maxPoints: retentionConfig.components.absences.maxPoints,
          phrase: phraseAbs
        },
        estagnacao: {
          points: scoreStag,
          maxPoints: retentionConfig.components.stagnation.maxPoints,
          phrase: phraseStag
        }
      }
    };
  });

  return {
    referenceDate: windows.referenceDate,
    departments,
    employees: scoredEmployees
  };
}

/**
 * Consulta a lista paginada e filtrada de colaboradores com índice de atenção
 */
async function getEmployeesList(filters = {}) {
  const {
    scope = 'company',
    departmentId,
    level,
    q,
    onlySignals = false,
    sort = 'score_desc',
    page = 1,
    limit = 25
  } = filters;

  const { employees, departments } = await computeRetentionAttentionIndex();

  let filtered = employees;

  // Filtro por escopo e departamento
  if (scope === 'department' && departmentId) {
    filtered = filtered.filter(e => String(e.departmentId) === String(departmentId));
  }

  // Filtro por nível
  if (level) {
    filtered = filtered.filter(e => e.level === level);
  }

  // Filtro por busca textual (nome ou matrícula)
  if (q && typeof q === 'string' && q.trim()) {
    const term = q.trim().toLowerCase();
    filtered = filtered.filter(e =>
      e.fullName.toLowerCase().includes(term) ||
      e.registration.toLowerCase().includes(term)
    );
  }

  // Filtro "Somente com sinais"
  if (onlySignals === true || onlySignals === 'true') {
    filtered = filtered.filter(e => e.signals && e.signals.length > 0 && e.level !== 'nao_aplicavel');
  }

  // Ordenação
  filtered.sort((a, b) => {
    switch (sort) {
      case 'score_asc':
        return (a.score ?? -1) - (b.score ?? -1);
      case 'absences_desc':
        return b.recentAbsences - a.recentAbsences;
      case 'overtime_desc':
        return b.avgRecentOvertime - a.avgRecentOvertime;
      case 'stagnation_desc':
        return b.monthsSinceLastMovement - a.monthsSinceLastMovement;
      case 'name_asc':
        return a.fullName.localeCompare(b.fullName);
      case 'score_desc':
      default:
        // Padrão: maior índice primeiro, colocando nulos ao final
        if (a.score === null && b.score === null) return 0;
        if (a.score === null) return 1;
        if (b.score === null) return -1;
        return b.score - a.score;
    }
  });

  const total = filtered.length;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.max(1, parseInt(limit, 10) || 25);
  const totalPages = Math.ceil(total / pageSize) || 1;
  const offset = (pageNum - 1) * pageSize;
  const pagedEmployees = filtered.slice(offset, offset + pageSize);

  return {
    employees: pagedEmployees,
    total,
    page: pageNum,
    limit: pageSize,
    totalPages,
    departments
  };
}

/**
 * Consulta a contagem agregada de colaboradores por nível
 */
async function getSummary({ scope = 'company', departmentId } = {}) {
  const { employees } = await computeRetentionAttentionIndex();

  let filtered = employees;
  if (scope === 'department' && departmentId) {
    filtered = filtered.filter(e => String(e.departmentId) === String(departmentId));
  }

  const counts = {
    total: filtered.length,
    alta: 0,
    moderada: 0,
    baixa: 0,
    insuficiente: 0,
    nao_aplicavel: 0
  };

  filtered.forEach(e => {
    if (counts[e.level] !== undefined) {
      counts[e.level]++;
    }
  });

  return counts;
}

/**
 * Retorna as regras e configurações do modelo para exibição transparente
 */
function getConfig() {
  return retentionConfig;
}

/**
 * Compara o resultado do cálculo com o gabarito SeedExpectedAttention
 */
async function compareWithSeedGabarito() {
  const [gabaritoList, { employees }] = await Promise.all([
    retentionRepository.getExpectedAttentionGabarito(),
    computeRetentionAttentionIndex()
  ]);

  const empMap = new Map();
  employees.forEach(e => {
    empMap.set(e.registration, e);
  });

  const comparison = gabaritoList.map(g => {
    const computed = empMap.get(g.Registration);
    const matches = computed ? computed.level === g.ExpectedLevel : false;
    return {
      registration: g.Registration,
      fullName: g.FullName || computed?.fullName,
      department: g.Department || computed?.department,
      expectedLevel: g.ExpectedLevel,
      computedLevel: computed?.level || 'não encontrado',
      computedScore: computed?.score ?? null,
      matches,
      note: g.Note
    };
  });

  const hot8 = comparison.filter(c => c.expectedLevel === 'alta');

  return {
    totalChecked: comparison.length,
    matchedCount: comparison.filter(c => c.matches).length,
    hot8
  };
}

/**
 * Retorna os detalhes completos de um colaborador para o painel lateral
 */
async function getEmployeeDetail(employeeId) {
  const empId = parseInt(employeeId, 10);
  const { employees, referenceDate } = await computeRetentionAttentionIndex();
  const employee = employees.find(e => e.id === empId);

  if (!employee) {
    return null;
  }

  // Busca dados complementares
  const [careerHistory, followUps, allAttendance, allEmployees] = await Promise.all([
    retentionRepository.getEmployeeCareerHistory(empId),
    retentionRepository.getFollowUps(empId),
    retentionRepository.getAttendanceHistory(new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 14, 1))),
    retentionRepository.getActiveEmployees()
  ]);

  // Monta série de 12 meses
  const ref = new Date(referenceDate);
  const curMonth = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1));
  const months12 = [];
  for (let k = 12; k >= 1; k--) {
    const d = new Date(curMonth);
    d.setUTCMonth(curMonth.getUTCMonth() - k);
    months12.push(formatMonthKey(d));
  }

  // Mapeia atendimento geral por `${dept}_${mKey}` e por `${empId}_${mKey}`
  const empAttendanceMap = new Map();
  const deptMonthAttendanceMap = new Map();

  allAttendance.forEach(a => {
    const mKey = formatMonthKey(a.MonthRef);
    if (a.EmployeeId === empId) {
      empAttendanceMap.set(mKey, a);
    }
  });

  const deptEmployees = allEmployees.filter(e => e.Department === employee.department);
  const deptEmpIds = new Set(deptEmployees.map(e => e.Id));

  allAttendance.forEach(a => {
    if (deptEmpIds.has(a.EmployeeId)) {
      const mKey = formatMonthKey(a.MonthRef);
      if (!deptMonthAttendanceMap.has(mKey)) {
        deptMonthAttendanceMap.set(mKey, { absences: [], overtimes: [] });
      }
      const entry = deptMonthAttendanceMap.get(mKey);
      entry.absences.push(a.AbsenceDays);
      entry.overtimes.push(a.OvertimeHours);
    }
  });

  const series12Months = months12.map(mKey => {
    const rec = empAttendanceMap.get(mKey);
    const deptData = deptMonthAttendanceMap.get(mKey);

    const deptMedianAbs = deptData ? calculateMedian(deptData.absences) : 1.0;
    const deptMedianOt = deptData ? calculateMedian(deptData.overtimes) : 1.0;

    return {
      month: mKey.substring(0, 7), // YYYY-MM
      personAbsences: rec ? rec.AbsenceDays : null,
      deptMedianAbsences: Number(deptMedianAbs.toFixed(1)),
      personOvertime: rec ? rec.OvertimeHours : null,
      deptMedianOvertime: Number(deptMedianOt.toFixed(1))
    };
  });

  const a11ySummary = `Nos últimos 3 meses, o colaborador registrou ${employee.recentAbsences.toFixed(1)} dias de ausência e média de ${employee.avgRecentOvertime.toFixed(1)} horas extras por mês. Comparado com a mediana departamental, o nível geral de atenção é ${employee.levelLabel}.`;

  return {
    ...employee,
    careerHistory: careerHistory.map(c => ({
      id: c.Id,
      eventDate: c.EventDate,
      eventType: c.EventType,
      newJobTitle: c.NewJobTitle,
      note: c.Note
    })),
    followUps: followUps.map(f => ({
      id: f.Id,
      actionType: f.ActionType,
      note: f.Note,
      createdAt: f.CreatedAt,
      createdByName: f.CreatedByEmail ? f.CreatedByEmail.split('@')[0] : 'RH'
    })),
    series12Months,
    a11ySummary
  };
}

/**
 * Adiciona um registro de acompanhamento
 */
async function addFollowUp(employeeId, userId, actionType, note) {
  return await retentionRepository.addFollowUp(employeeId, userId, actionType, note);
}

module.exports = {
  computeRetentionAttentionIndex,
  getEmployeesList,
  getEmployeeDetail,
  addFollowUp,
  getSummary,
  getConfig,
  compareWithSeedGabarito
};
