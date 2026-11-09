// backend/src/services/complianceRulesService.js
const complianceLimits = require('../config/complianceLimits');

/**
 * Validador de dígitos verificadores de CPF
 */
function isValidCpfDigits(cpf) {
  if (!cpf || typeof cpf !== 'string') return false;
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i), 10) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i), 10) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

/**
 * Calcula idade em anos completos entre duas datas
 */
function calculateAgeAtDate(birthDateStr, referenceDateStr) {
  const birth = new Date(birthDateStr + 'T00:00:00Z');
  const ref = new Date(referenceDateStr + 'T00:00:00Z');
  let age = ref.getUTCFullYear() - birth.getUTCFullYear();
  const m = ref.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && ref.getUTCDate() < birth.getUTCDate())) {
    age--;
  }
  return age;
}

// ==========================================
// REGRAS DE INTEGRIDADE DE DADOS
// ==========================================

// 1. EMP_REQ_FIELDS
function validateEmpReqFields(emp) {
  const missing = [];
  if (!emp.FullName || emp.FullName.trim().length === 0) missing.push('Nome completo');
  if (!emp.Cpf || String(emp.Cpf).trim().length === 0) missing.push('CPF');
  if (!emp.BirthDate) missing.push('Data de nascimento');
  if (!emp.HireDate) missing.push('Data de admissão');
  if (!emp.JobTitle || emp.JobTitle.trim().length === 0) missing.push('Cargo');
  if (!emp.Department || emp.Department.trim().length === 0) missing.push('Departamento');
  if (emp.BaseSalary === null || emp.BaseSalary === undefined) missing.push('Salário base');

  if (missing.length > 0) {
    return {
      ruleCode: 'EMP_REQ_FIELDS',
      entityType: 'employee',
      entityId: emp.Id,
      employeeId: emp.Id,
      priority: 'alta',
      description: `Colaborador ${emp.FullName || emp.Registration} possui campos obrigatórios não preenchidos: ${missing.join(', ')}.`
    };
  }
  return null;
}

// 2. EMP_CPF_INVALID
function validateEmpCpf(emp) {
  if (emp.Cpf && !isValidCpfDigits(emp.Cpf)) {
    return {
      ruleCode: 'EMP_CPF_INVALID',
      entityType: 'employee',
      entityId: emp.Id,
      employeeId: emp.Id,
      priority: 'alta',
      description: `O CPF cadastrado para o colaborador ${emp.FullName} possui dígitos verificadores incorretos.`
    };
  }
  return null;
}

// 3. EMP_DUP_PERSON
function validateEmpDupPerson(allEmployees) {
  const issues = [];
  const map = new Map();

  for (const emp of allEmployees) {
    if (!emp.FullName || !emp.BirthDate) continue;
    const bDate = String(emp.BirthDate).split('T')[0];
    const key = `${emp.FullName.trim().toLowerCase()}_${bDate}`;

    if (map.has(key)) {
      const prev = map.get(key);
      issues.push({
        ruleCode: 'EMP_DUP_PERSON',
        entityType: 'employee',
        entityId: emp.Id,
        employeeId: emp.Id,
        priority: 'media',
        description: `Possível duplicidade cadastral: Colaborador ${emp.FullName} (Matrícula ${emp.Registration}) possui mesmo nome e data de nascimento (${bDate}) do registro ${prev.Registration}.`
      });
      issues.push({
        ruleCode: 'EMP_DUP_PERSON',
        entityType: 'employee',
        entityId: prev.Id,
        employeeId: prev.Id,
        priority: 'media',
        description: `Possível duplicidade cadastral: Colaborador ${prev.FullName} (Matrícula ${prev.Registration}) possui mesmo nome e data de nascimento (${bDate}) do registro ${emp.Registration}.`
      });
    } else {
      map.set(key, emp);
    }
  }
  return issues;
}

// 4. EMP_DATES_ORDER
function validateEmpDatesOrder(emp) {
  if (!emp.HireDate) return null;
  const hireStr = String(emp.HireDate).split('T')[0];

  if (emp.TerminationDate) {
    const termStr = String(emp.TerminationDate).split('T')[0];
    if (termStr < hireStr) {
      return {
        ruleCode: 'EMP_DATES_ORDER',
        entityType: 'employee',
        entityId: emp.Id,
        employeeId: emp.Id,
        priority: 'alta',
        description: `Incoerência cronológica: Data de desligamento (${termStr}) é anterior à data de admissão (${hireStr}) no colaborador ${emp.FullName}.`
      };
    }
  }

  // Verifica admissão excessivamente futura
  const hireDate = new Date(hireStr + 'T00:00:00Z');
  const maxFuture = new Date();
  maxFuture.setUTCDate(maxFuture.getUTCDate() + complianceLimits.MAX_FUTURE_HIRE_DAYS);

  if (hireDate > maxFuture) {
    return {
      ruleCode: 'EMP_DATES_ORDER',
      entityType: 'employee',
      entityId: emp.Id,
      employeeId: emp.Id,
      priority: 'alta',
      description: `Data de admissão (${hireStr}) está mais de ${complianceLimits.MAX_FUTURE_HIRE_DAYS} dias no futuro para o colaborador ${emp.FullName}.`
    };
  }

  return null;
}

// 5. EMP_STATUS_TERM
function validateEmpStatusTerm(emp) {
  const isDesligado = (emp.Status || '').toLowerCase() === 'desligado';
  const hasTermDate = Boolean(emp.TerminationDate);

  if (isDesligado && !hasTermDate) {
    return {
      ruleCode: 'EMP_STATUS_TERM',
      entityType: 'employee',
      entityId: emp.Id,
      employeeId: emp.Id,
      priority: 'media',
      description: `Colaborador ${emp.FullName} está marcado com status "desligado", mas não possui Data de Desligamento informada.`
    };
  }

  if (!isDesligado && hasTermDate) {
    const termDate = new Date(String(emp.TerminationDate).split('T')[0] + 'T00:00:00Z');
    const today = new Date();
    if (termDate <= today) {
      return {
        ruleCode: 'EMP_STATUS_TERM',
        entityType: 'employee',
        entityId: emp.Id,
        employeeId: emp.Id,
        priority: 'media',
        description: `Colaborador ${emp.FullName} possui Data de Desligamento no passado (${String(emp.TerminationDate).split('T')[0]}), mas seu status contratual permanece como "${emp.Status}".`
      };
    }
  }

  return null;
}

// 6. PAY_TOTALS
function validatePayTotals(payslip, items = []) {
  let sumP = 0;
  let sumD = 0;

  for (const item of items) {
    const amt = Number(item.Amount || 0);
    if (item.Kind === 'P') sumP += amt;
    else if (item.Kind === 'D') sumD += amt;
  }

  sumP = Math.round(sumP * 100) / 100;
  sumD = Math.round(sumD * 100) / 100;
  const headerGross = Math.round(Number(payslip.GrossAmount || 0) * 100) / 100;
  const headerDed = Math.round(Number(payslip.TotalDeductions || 0) * 100) / 100;

  if (Math.abs(headerGross - sumP) > 0.05 || Math.abs(headerDed - sumD) > 0.05) {
    return {
      ruleCode: 'PAY_TOTALS',
      entityType: 'payslip',
      entityId: payslip.Id,
      employeeId: payslip.EmployeeId,
      priority: 'alta',
      description: `Holerite (competência ${payslip.Competence}) com totais divergentes das rubricas: Bruto cabeçalho R$ ${headerGross.toFixed(2)} (soma R$ ${sumP.toFixed(2)}), Descontos R$ ${headerDed.toFixed(2)} (soma R$ ${sumD.toFixed(2)}).`
    };
  }
  return null;
}

// 7. PAY_NET_NONPOSITIVE
function validatePayNetNonPositive(payslip) {
  const gross = Number(payslip.GrossAmount || 0);
  const ded = Number(payslip.TotalDeductions || 0);
  const net = gross - ded;

  if (net <= 0) {
    return {
      ruleCode: 'PAY_NET_NONPOSITIVE',
      entityType: 'payslip',
      entityId: payslip.Id,
      employeeId: payslip.EmployeeId,
      priority: 'media',
      description: `Holerite (competência ${payslip.Competence}) com salário líquido menor ou igual a zero (Bruto: R$ ${gross.toFixed(2)}, Descontos: R$ ${ded.toFixed(2)}, Líquido: R$ ${net.toFixed(2)}).`
    };
  }
  return null;
}

// 8. VAC_OVER
function validateVacOver(vac) {
  const entitled = Number(vac.DaysEntitled || 0);
  const taken = Number(vac.DaysTaken || 0);

  if (taken > entitled) {
    return {
      ruleCode: 'VAC_OVER',
      entityType: 'vacation',
      entityId: vac.Id,
      employeeId: vac.EmployeeId,
      priority: 'media',
      description: `Período aquisitivo (${String(vac.PeriodStart).split('T')[0]} a ${String(vac.PeriodEnd).split('T')[0]}): dias de férias gozados (${taken}) excedem os dias de direito (${entitled}).`
    };
  }
  return null;
}

// 9. LEAVE_DATES
function validateLeaveDates(leave) {
  if (leave.StartDate && leave.EndDate) {
    const startStr = String(leave.StartDate).split('T')[0];
    const endStr = String(leave.EndDate).split('T')[0];
    if (endStr < startStr) {
      return {
        ruleCode: 'LEAVE_DATES',
        entityType: 'leave',
        entityId: leave.Id,
        employeeId: leave.EmployeeId,
        priority: 'alta',
        description: `Afastamento (tipo ${leave.LeaveType}) com data de término (${endStr}) anterior à data de início (${startStr}).`
      };
    }
  }
  return null;
}

// 10. LEAVE_OVERLAP
function validateLeaveOverlap(leaves) {
  const issues = [];
  if (!leaves || leaves.length < 2) return issues;

  for (let i = 0; i < leaves.length; i++) {
    for (let j = i + 1; j < leaves.length; j++) {
      const l1 = leaves[i];
      const l2 = leaves[j];
      const s1 = String(l1.StartDate).split('T')[0];
      const e1 = l1.EndDate ? String(l1.EndDate).split('T')[0] : '9999-12-31';
      const s2 = String(l2.StartDate).split('T')[0];
      const e2 = l2.EndDate ? String(l2.EndDate).split('T')[0] : '9999-12-31';

      // Checa sobreposição de intervalos: (s1 <= e2 && s2 <= e1)
      if (s1 <= e2 && s2 <= e1) {
        issues.push({
          ruleCode: 'LEAVE_OVERLAP',
          entityType: 'leave',
          entityId: l1.Id,
          employeeId: l1.EmployeeId,
          priority: 'media',
          description: `Afastamento ID ${l1.Id} (${s1} a ${e1}) sobrepõe o período do afastamento ID ${l2.Id} (${s2} a ${e2}).`
        });
      }
    }
  }
  return issues;
}

// ==========================================
// REGRAS COM BASE LEGAL (CLT/CF)
// ==========================================

// 11. JOB_WEEKLY_HOURS
function validateJobWeeklyHours(emp) {
  const hours = Number(emp.WeeklyHours || 0);
  if (hours > complianceLimits.MAX_WEEKLY_HOURS) {
    return {
      ruleCode: 'JOB_WEEKLY_HOURS',
      entityType: 'employee',
      entityId: emp.Id,
      employeeId: emp.Id,
      priority: 'alta',
      description: `Jornada semanal de ${hours}h informada para o colaborador ${emp.FullName} excede o limite legal padrão de ${complianceLimits.MAX_WEEKLY_HOURS}h semanais.`
    };
  }
  return null;
}

// 12. EMP_MIN_AGE
function validateEmpMinAge(emp) {
  if (emp.BirthDate && emp.HireDate) {
    const age = calculateAgeAtDate(emp.BirthDate, emp.HireDate);
    if (age < complianceLimits.MIN_ADMISSION_AGE) {
      return {
        ruleCode: 'EMP_MIN_AGE',
        entityType: 'employee',
        entityId: emp.Id,
        employeeId: emp.Id,
        priority: 'alta',
        description: `Idade do colaborador ${emp.FullName} na data de admissão (${age} anos) é inferior à idade mínima legal de ${complianceLimits.MIN_ADMISSION_AGE} anos.`
      };
    }
  }
  return null;
}

// ==========================================
// CHECKLIST PRÉ-ENVIO ESOCIAL
// ==========================================

// S-2200 Admissão
function validateEsocialS2200(emp) {
  const problems = [];
  if (!emp.Cpf || !isValidCpfDigits(emp.Cpf)) problems.push('CPF inválido ou ausente');
  if (!emp.FullName || emp.FullName.trim().length === 0) problems.push('Nome ausente');
  if (!emp.BirthDate) problems.push('Data de nascimento ausente');
  if (!emp.HireDate) problems.push('Data de admissão ausente');
  if (!emp.JobTitle || emp.JobTitle.trim().length === 0) problems.push('Cargo ausente');
  if (emp.BaseSalary === null || emp.BaseSalary === undefined) problems.push('Salário base ausente');
  if (!emp.WeeklyHours || Number(emp.WeeklyHours) > complianceLimits.MAX_WEEKLY_HOURS) problems.push('Jornada semanal inválida ou superior a 44h');

  if (problems.length > 0) {
    return {
      ruleCode: 'ESOCIAL_S2200',
      eventCode: 'S-2200',
      entityType: 'employee',
      entityId: emp.Id,
      employeeId: emp.Id,
      priority: 'alta',
      description: `Pré-envio S-2200 (Admissão) com pendências impeditivas: ${problems.join('; ')}.`
    };
  }
  return null;
}

// S-2230 Afastamento
function validateEsocialS2230(leave, emp) {
  const problems = [];
  if (!leave.LeaveType) problems.push('Tipo de afastamento ausente');
  if (!leave.StartDate) problems.push('Data de início ausente');
  if (leave.StartDate && leave.EndDate) {
    const s = String(leave.StartDate).split('T')[0];
    const e = String(leave.EndDate).split('T')[0];
    if (e < s) problems.push(`Data final (${e}) anterior à data inicial (${s})`);
  }

  if (problems.length > 0) {
    return {
      ruleCode: 'ESOCIAL_S2230',
      eventCode: 'S-2230',
      entityType: 'leave',
      entityId: leave.Id,
      employeeId: leave.EmployeeId,
      priority: 'alta',
      description: `Pré-envio S-2230 (Afastamento do colaborador ${emp?.FullName || leave.EmployeeId}) com pendências: ${problems.join('; ')}.`
    };
  }
  return null;
}

// S-2299 Desligamento
function validateEsocialS2299(emp) {
  const problems = [];
  if (!emp.TerminationDate) {
    problems.push('Data de desligamento não preenchida');
  } else if (emp.HireDate) {
    const sTerm = String(emp.TerminationDate).split('T')[0];
    const sHire = String(emp.HireDate).split('T')[0];
    if (sTerm < sHire) {
      problems.push(`Data de desligamento (${sTerm}) anterior à admissão (${sHire})`);
    }
  }

  if (problems.length > 0) {
    return {
      ruleCode: 'ESOCIAL_S2299',
      eventCode: 'S-2299',
      entityType: 'employee',
      entityId: emp.Id,
      employeeId: emp.Id,
      priority: 'alta',
      description: `Pré-envio S-2299 (Desligamento do colaborador ${emp.FullName}) com pendências: ${problems.join('; ')}.`
    };
  }
  return null;
}

module.exports = {
  isValidCpfDigits,
  validateEmpReqFields,
  validateEmpCpf,
  validateEmpDupPerson,
  validateEmpDatesOrder,
  validateEmpStatusTerm,
  validatePayTotals,
  validatePayNetNonPositive,
  validateVacOver,
  validateLeaveDates,
  validateLeaveOverlap,
  validateJobWeeklyHours,
  validateEmpMinAge,
  validateEsocialS2200,
  validateEsocialS2230,
  validateEsocialS2299
};
