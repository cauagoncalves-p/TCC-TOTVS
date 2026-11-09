// backend/src/services/complianceRunService.js
const { poolPromise } = require('../config/db');
const complianceRuleRepository = require('../repositories/complianceRuleRepository');
const complianceRunRepository = require('../repositories/complianceRunRepository');
const complianceIssueRepository = require('../repositories/complianceIssueRepository');
const esocialEventRepository = require('../repositories/esocialEventRepository');
const auditLogRepository = require('../repositories/auditLogRepository');
const rulesService = require('./complianceRulesService');

/**
 * Executa uma rodada de auditoria de conformidade
 * @param {Object} params { scope: 'cadastros' | 'esocial', eventCode?: string, userId: number }
 */
async function executeRun({ scope, eventCode, userId }) {
  if (!scope || !['cadastros', 'esocial'].includes(scope)) {
    const error = new Error("Escopo inválido. Valores aceitos: 'cadastros' ou 'esocial'.");
    error.status = 400;
    throw error;
  }

  // 1. Cria a execução no banco
  const run = await complianceRunRepository.createRun({ scope, eventCode, startedBy: userId });
  const pool = await poolPromise;

  // Carrega catálogo de regras ativas
  const rules = await complianceRuleRepository.listRules({ isActive: true });
  const ruleMap = new Map();
  for (const r of rules) ruleMap.set(r.Code, r);

  const activeDetectedIssueIds = [];
  let recordsAnalyzed = 0;
  let issuesNewCount = 0;

  if (scope === 'cadastros') {
    // -----------------------------------------------------------------
    // AUDITORIA DE CADASTROS: COLABORADORES, HOLERITES, FÉRIAS, AFASTAMENTOS
    // -----------------------------------------------------------------

    // 1. Colaboradores
    const empRes = await pool.request().query(`
      SELECT
        Id, UserId, FullName, Registration, JobTitle, Department,
        CONVERT(VARCHAR(10), HireDate, 120) AS HireDate,
        CONVERT(VARCHAR(10), TerminationDate, 120) AS TerminationDate,
        Cpf, CONVERT(VARCHAR(10), BirthDate, 120) AS BirthDate,
        BaseSalary, WeeklyHours, ContractType, Status
      FROM dbo.Employees
    `);
    const employees = empRes.recordset;
    recordsAnalyzed += employees.length;

    // Regras individuais por colaborador
    for (const emp of employees) {
      const candidates = [
        rulesService.validateEmpReqFields(emp),
        rulesService.validateEmpCpf(emp),
        rulesService.validateEmpDatesOrder(emp),
        rulesService.validateEmpStatusTerm(emp),
        rulesService.validateJobWeeklyHours(emp),
        rulesService.validateEmpMinAge(emp)
      ].filter(Boolean);

      for (const cand of candidates) {
        const rule = ruleMap.get(cand.ruleCode);
        if (rule) {
          const res = await complianceIssueRepository.upsertIssue({
            ruleId: rule.Id,
            employeeId: cand.employeeId,
            entityType: cand.entityType,
            entityId: cand.entityId,
            eventCode: null,
            priority: cand.priority,
            description: cand.description,
            runId: run.Id
          });
          activeDetectedIssueIds.push(res.Id);
          if (res.IsNew) issuesNewCount++;
        }
      }
    }

    // Regra cruzada de duplicidade de pessoa (EMP_DUP_PERSON)
    const dupCandidates = rulesService.validateEmpDupPerson(employees);
    for (const cand of dupCandidates) {
      const rule = ruleMap.get(cand.ruleCode);
      if (rule) {
        const res = await complianceIssueRepository.upsertIssue({
          ruleId: rule.Id,
          employeeId: cand.employeeId,
          entityType: cand.entityType,
          entityId: cand.entityId,
          eventCode: null,
          priority: cand.priority,
          description: cand.description,
          runId: run.Id
        });
        activeDetectedIssueIds.push(res.Id);
        if (res.IsNew) issuesNewCount++;
      }
    }

    // 2. Holerites e rubricas
    const payRes = await pool.request().query(`
      SELECT Id, EmployeeId, Competence, GrossAmount, TotalDeductions
      FROM dbo.Payslips
    `);
    const payslips = payRes.recordset;
    recordsAnalyzed += payslips.length;

    const itemsRes = await pool.request().query(`
      SELECT PayslipId, Code, Kind, Amount
      FROM dbo.PayslipItems
    `);
    const itemsByPayslip = new Map();
    for (const item of itemsRes.recordset) {
      if (!itemsByPayslip.has(item.PayslipId)) itemsByPayslip.set(item.PayslipId, []);
      itemsByPayslip.get(item.PayslipId).push(item);
    }

    for (const pay of payslips) {
      const items = itemsByPayslip.get(pay.Id) || [];
      const payCandidates = [
        rulesService.validatePayTotals(pay, items),
        rulesService.validatePayNetNonPositive(pay)
      ].filter(Boolean);

      for (const cand of payCandidates) {
        const rule = ruleMap.get(cand.ruleCode);
        if (rule) {
          const res = await complianceIssueRepository.upsertIssue({
            ruleId: rule.Id,
            employeeId: cand.employeeId,
            entityType: cand.entityType,
            entityId: cand.entityId,
            eventCode: null,
            priority: cand.priority,
            description: cand.description,
            runId: run.Id
          });
          activeDetectedIssueIds.push(res.Id);
          if (res.IsNew) issuesNewCount++;
        }
      }
    }

    // 3. Férias
    const vacRes = await pool.request().query(`
      SELECT Id, EmployeeId, PeriodStart, PeriodEnd, DaysEntitled, DaysTaken
      FROM dbo.VacationBalances
    `);
    recordsAnalyzed += vacRes.recordset.length;

    for (const vac of vacRes.recordset) {
      const cand = rulesService.validateVacOver(vac);
      if (cand) {
        const rule = ruleMap.get(cand.ruleCode);
        if (rule) {
          const res = await complianceIssueRepository.upsertIssue({
            ruleId: rule.Id,
            employeeId: cand.employeeId,
            entityType: cand.entityType,
            entityId: cand.entityId,
            eventCode: null,
            priority: cand.priority,
            description: cand.description,
            runId: run.Id
          });
          activeDetectedIssueIds.push(res.Id);
          if (res.IsNew) issuesNewCount++;
        }
      }
    }

    // 4. Afastamentos
    const leaveRes = await pool.request().query(`
      SELECT Id, EmployeeId, LeaveType, StartDate, EndDate
      FROM dbo.Leaves
    `);
    const leaves = leaveRes.recordset;
    recordsAnalyzed += leaves.length;

    const leavesByEmp = new Map();
    for (const l of leaves) {
      if (!leavesByEmp.has(l.EmployeeId)) leavesByEmp.set(l.EmployeeId, []);
      leavesByEmp.get(l.EmployeeId).push(l);

      const cand = rulesService.validateLeaveDates(l);
      if (cand) {
        const rule = ruleMap.get(cand.ruleCode);
        if (rule) {
          const res = await complianceIssueRepository.upsertIssue({
            ruleId: rule.Id,
            employeeId: cand.employeeId,
            entityType: cand.entityType,
            entityId: cand.entityId,
            eventCode: null,
            priority: cand.priority,
            description: cand.description,
            runId: run.Id
          });
          activeDetectedIssueIds.push(res.Id);
          if (res.IsNew) issuesNewCount++;
        }
      }
    }

    // Regra de sobreposição de afastamentos (LEAVE_OVERLAP)
    for (const [, empLeaves] of leavesByEmp) {
      const overlapCandidates = rulesService.validateLeaveOverlap(empLeaves);
      for (const cand of overlapCandidates) {
        const rule = ruleMap.get(cand.ruleCode);
        if (rule) {
          const res = await complianceIssueRepository.upsertIssue({
            ruleId: rule.Id,
            employeeId: cand.employeeId,
            entityType: cand.entityType,
            entityId: cand.entityId,
            eventCode: null,
            priority: cand.priority,
            description: cand.description,
            runId: run.Id
          });
          activeDetectedIssueIds.push(res.Id);
          if (res.IsNew) issuesNewCount++;
        }
      }
    }
  } else if (scope === 'esocial') {
    // -----------------------------------------------------------------
    // AUDITORIA PREVENTIVA DE PRÉ-ENVIO DE EVENTOS ESOCIAL (SIMULADA)
    // -----------------------------------------------------------------
    const events = await esocialEventRepository.listEvents({ eventCode });
    recordsAnalyzed += events.length;

    for (const ev of events) {
      let cand = null;

      if (ev.EventCode === 'S-2200') {
        const empQuery = await pool.request()
          .input('empId', ev.EmployeeId)
          .query('SELECT * FROM dbo.Employees WHERE Id = @empId');
        const emp = empQuery.recordset[0];
        if (emp) cand = rulesService.validateEsocialS2200(emp);
      } else if (ev.EventCode === 'S-2230') {
        let leave = null;
        if (ev.LeaveId) {
          const lq = await pool.request().input('lId', ev.LeaveId).query('SELECT * FROM dbo.Leaves WHERE Id = @lId');
          leave = lq.recordset[0];
        }
        cand = rulesService.validateEsocialS2230(leave || { EmployeeId: ev.EmployeeId });
      } else if (ev.EventCode === 'S-2299') {
        const empQuery = await pool.request()
          .input('empId', ev.EmployeeId)
          .query('SELECT * FROM dbo.Employees WHERE Id = @empId');
        const emp = empQuery.recordset[0];
        if (emp) cand = rulesService.validateEsocialS2299(emp);
      }

      if (cand) {
        const rule = ruleMap.get(cand.ruleCode);
        if (rule) {
          const res = await complianceIssueRepository.upsertIssue({
            ruleId: rule.Id,
            employeeId: cand.employeeId,
            entityType: cand.entityType,
            entityId: cand.entityId,
            eventCode: cand.eventCode,
            priority: cand.priority,
            description: cand.description,
            runId: run.Id
          });
          activeDetectedIssueIds.push(res.Id);
          if (res.IsNew) issuesNewCount++;
        }
        // Atualiza status do evento para 'com_inconsistencias'
        if (ev.Status !== 'enviado_simulado') {
          await esocialEventRepository.updateStatus(ev.Id, { status: 'com_inconsistencias', lastRunId: run.Id });
        }
      } else {
        // Sem inconsistências no evento: pronto para envio
        if (ev.Status !== 'enviado_simulado') {
          await esocialEventRepository.updateStatus(ev.Id, { status: 'pronto_para_envio', lastRunId: run.Id });
        }
      }
    }
  }

  // 3. Reanálise: fecha como corrigidas quaisquer inconsistências que estavam abertas
  // mas não foram detectadas nesta execução
  await complianceIssueRepository.resolveMissingIssues({
    runId: run.Id,
    scope,
    activeIssueIds: activeDetectedIssueIds
  });

  // 4. Finaliza a execução no banco
  const issuesOpenTotal = activeDetectedIssueIds.length;
  await complianceRunRepository.finishRun(run.Id, {
    recordsAnalyzed,
    issuesNew: issuesNewCount,
    issuesOpen: issuesOpenTotal
  });

  // 5. Registra em ComplianceAuditLog
  await auditLogRepository.log({
    userId,
    action: 'run_started',
    entityType: 'compliance_run',
    entityId: run.Id,
    detailsJson: {
      scope,
      eventCode: eventCode || null,
      recordsAnalyzed,
      issuesNew: issuesNewCount,
      issuesOpen: issuesOpenTotal
    }
  });

  return {
    runId: run.Id,
    scope,
    eventCode: eventCode || null,
    recordsAnalyzed,
    issuesNew: issuesNewCount,
    issuesOpen: issuesOpenTotal,
    finishedAt: new Date().toISOString()
  };
}

/**
 * Atualiza status de uma inconsistência (marcar como 'corrigida' ou 'ignorada')
 */
async function updateIssueStatus(id, { status, resolutionNote, userId }) {
  const allowed = ['corrigida', 'ignorada'];
  if (!status || !allowed.includes(status)) {
    const error = new Error(`Status inválido. Valores aceitos: ${allowed.join(', ')}.`);
    error.status = 400;
    throw error;
  }

  // Justificativa é obrigatória para status 'ignorada'
  if (status === 'ignorada' && (!resolutionNote || resolutionNote.trim().length === 0)) {
    const error = new Error("Justificativa obrigatória: para marcar uma inconsistência como 'ignorada', informe o motivo em 'resolutionNote'.");
    error.status = 400;
    throw error;
  }

  const existing = await complianceIssueRepository.getById(id);
  if (!existing) {
    const error = new Error('Inconsistência não encontrada.');
    error.status = 404;
    throw error;
  }

  const updated = await complianceIssueRepository.updateStatus(id, {
    status,
    resolvedBy: userId,
    resolutionNote: resolutionNote ? resolutionNote.trim() : null
  });

  // Registra no log de auditoria
  await auditLogRepository.log({
    userId,
    action: status === 'corrigida' ? 'issue_resolved' : 'issue_ignored',
    entityType: 'compliance_issue',
    entityId: id,
    detailsJson: {
      ruleCode: existing.RuleCode,
      status,
      resolutionNote: resolutionNote || null
    }
  });

  return updated;
}

/**
 * Confirmação humana do envio simulado do evento eSocial
 */
async function confirmEsocialEvent(id, userId) {
  const event = await esocialEventRepository.getById(id);
  if (!event) {
    const error = new Error('Evento eSocial não encontrado.');
    error.status = 404;
    throw error;
  }

  if (event.Status === 'enviado_simulado') {
    const error = new Error('Este evento já foi confirmado e enviado anteriormente.');
    error.status = 409;
    throw error;
  }

  // Verifica se há pendência de prioridade alta aberta
  const hasHighIssues = await esocialEventRepository.hasOpenHighPriorityIssues(id);
  if (hasHighIssues) {
    const error = new Error('Bloqueio de envio: Não é permitida a confirmação enquanto houver inconsistências de prioridade alta abertas associadas a este evento.');
    error.status = 422;
    throw error;
  }

  const confirmed = await esocialEventRepository.confirmEvent(id, userId);

  // Registra no log de auditoria
  await auditLogRepository.log({
    userId,
    action: 'esocial_confirmed',
    entityType: 'esocial_event',
    entityId: id,
    detailsJson: {
      eventCode: event.EventCode,
      employeeId: event.EmployeeId,
      confirmedAt: new Date().toISOString()
    }
  });

  return confirmed;
}

module.exports = {
  executeRun,
  updateIssueStatus,
  confirmEsocialEvent
};
