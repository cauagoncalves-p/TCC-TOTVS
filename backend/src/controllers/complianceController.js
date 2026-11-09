// backend/src/controllers/complianceController.js
const complianceRuleRepository = require('../repositories/complianceRuleRepository');
const complianceRunRepository = require('../repositories/complianceRunRepository');
const complianceIssueRepository = require('../repositories/complianceIssueRepository');
const esocialEventRepository = require('../repositories/esocialEventRepository');
const auditLogRepository = require('../repositories/auditLogRepository');
const complianceRunService = require('../services/complianceRunService');

// GET /api/compliance/rules
exports.listRules = async (req, res) => {
  try {
    const { category, isActive } = req.query;
    const rules = await complianceRuleRepository.listRules({
      category,
      isActive: isActive !== undefined ? isActive === 'true' : undefined
    });
    return res.json({ rules });
  } catch (err) {
    console.error('Erro ao listar regras de compliance:', err);
    return res.status(500).json({ error: 'Erro interno ao consultar catálogo de regras.' });
  }
};

// POST /api/compliance/runs
exports.executeRun = async (req, res) => {
  const { scope, eventCode } = req.body;
  try {
    const result = await complianceRunService.executeRun({
      scope,
      eventCode,
      userId: req.user.id
    });
    return res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};

// GET /api/compliance/runs
exports.listRuns = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const runs = await complianceRunRepository.listRuns({ limit });
    return res.json({ runs });
  } catch (err) {
    console.error('Erro ao listar execuções de compliance:', err);
    return res.status(500).json({ error: 'Erro interno ao listar execuções.' });
  }
};

// GET /api/compliance/issues
exports.listIssues = async (req, res) => {
  try {
    const { status, priority, eventCode, employeeId, department } = req.query;
    const issues = await complianceIssueRepository.list({
      status,
      priority,
      eventCode,
      employeeId: employeeId ? parseInt(employeeId, 10) : undefined,
      department
    });
    return res.json({ issues });
  } catch (err) {
    console.error('Erro ao listar inconsistências:', err);
    return res.status(500).json({ error: 'Erro interno ao listar inconsistências.' });
  }
};

// PATCH /api/compliance/issues/:id
exports.updateIssueStatus = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status, resolutionNote } = req.body;
  try {
    const updated = await complianceRunService.updateIssueStatus(id, {
      status,
      resolutionNote,
      userId: req.user.id
    });
    return res.json(updated);
  } catch (err) {
    const code = err.status || 500;
    return res.status(code).json({ error: err.message });
  }
};

// GET /api/compliance/esocial/events
exports.listEsocialEvents = async (req, res) => {
  try {
    const { status, eventCode } = req.query;
    const events = await esocialEventRepository.listEvents({ status, eventCode });
    return res.json({ events });
  } catch (err) {
    console.error('Erro ao listar eventos eSocial:', err);
    return res.status(500).json({ error: 'Erro interno ao listar eventos eSocial.' });
  }
};

// POST /api/compliance/esocial/events/:id/confirm
exports.confirmEsocialEvent = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const confirmed = await complianceRunService.confirmEsocialEvent(id, req.user.id);
    return res.json({
      message: 'Evento eSocial confirmado com sucesso (envio simulado registrado).',
      event: confirmed
    });
  } catch (err) {
    const code = err.status || 500;
    return res.status(code).json({ error: err.message });
  }
};

// GET /api/compliance/audit-log
exports.listAuditLog = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
    const result = await auditLogRepository.listLogs({ limit, offset });
    return res.json(result);
  } catch (err) {
    console.error('Erro ao listar logs de auditoria:', err);
    return res.status(500).json({ error: 'Erro interno ao listar auditoria.' });
  }
};
