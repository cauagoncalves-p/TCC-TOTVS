// backend/src/controllers/retentionController.js
const retentionService = require('../services/retentionService');
const auditLogRepository = require('../repositories/auditLogRepository');

/**
 * GET /api/retention/employees
 * Lista colaboradores com índice de atenção (apenas perfil rh)
 */
async function getEmployees(req, res) {
  try {
    const { scope, departmentId, level, q, onlySignals, sort, page, limit } = req.query;

    // Proteção de segurança: limite no termo de busca textual
    if (q && typeof q === 'string' && q.length > 80) {
      return res.status(400).json({ error: 'Termo de busca muito longo (máximo 80 caracteres).' });
    }

    const result = await retentionService.getEmployeesList({
      scope,
      departmentId: departmentId ? parseInt(departmentId, 10) : undefined,
      level,
      q,
      onlySignals: onlySignals === 'true' || onlySignals === true,
      sort,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 25
    });

    // Registra acesso na auditoria (sem copiar dados pessoais no log)
    try {
      await auditLogRepository.log({
        userId: req.user?.id,
        action: 'CONSULTA_ACOMPANHAMENTO_INDIVIDUAL',
        entityType: 'Employees',
        entityId: departmentId ? `Dept:${departmentId}` : 'Empresa',
        detailsJson: {
          scope: scope || 'company',
          departmentId: departmentId || null,
          levelFilter: level || null
        }
      });
    } catch (auditErr) {
      console.error('Falha não-bloqueante ao registrar auditoria de acompanhamento:', auditErr.message);
    }

    return res.json(result);
  } catch (error) {
    console.error('Erro ao consultar lista de acompanhamento individual:', error);
    return res.status(500).json({ error: 'Erro interno ao processar índice de atenção dos colaboradores.' });
  }
}

/**
 * GET /api/retention/summary
 * Resumo dos níveis de atenção (apenas perfil rh)
 */
async function getSummary(req, res) {
  try {
    const { scope, departmentId } = req.query;

    const summary = await retentionService.getSummary({
      scope,
      departmentId: departmentId ? parseInt(departmentId, 10) : undefined
    });

    return res.json(summary);
  } catch (error) {
    console.error('Erro ao consultar resumo de retenção:', error);
    return res.status(500).json({ error: 'Erro interno ao consultar resumo dos colaboradores.' });
  }
}

/**
 * GET /api/retention/config
 * Parâmetros, limites e regras do modelo de retenção (transparência e explicabilidade)
 */
async function getConfig(req, res) {
  try {
    const config = retentionService.getConfig();
    return res.json(config);
  } catch (error) {
    console.error('Erro ao consultar configuração do índice de atenção:', error);
    return res.status(500).json({ error: 'Erro ao consultar regras do índice de atenção.' });
  }
}

/**
 * GET /api/retention/gabarito-check
 * Endpoint de verificação para o TCC conferir as 8 pessoas do gabarito SeedExpectedAttention
 */
async function getGabaritoComparison(req, res) {
  try {
    const comparison = await retentionService.compareWithSeedGabarito();
    return res.json(comparison);
  } catch (error) {
    console.error('Erro ao conferir gabarito:', error);
    return res.status(500).json({ error: 'Erro ao comparar com o gabarito de teste.' });
  }
}

/**
 * GET /api/retention/employees/:id
 * Detalhes completos do colaborador para o painel lateral (apenas perfil rh)
 * Registra o acesso individual na auditoria.
 */
async function getEmployeeById(req, res) {
  try {
    const { id } = req.params;
    const detail = await retentionService.getEmployeeDetail(id);

    if (!detail) {
      return res.status(404).json({ error: 'Colaborador não encontrado ou inativo.' });
    }

    // Registra o acesso ao detalhe na auditoria (sem copiar dados pessoais no log)
    try {
      await auditLogRepository.log({
        userId: req.user?.id,
        action: 'CONSULTA_DETALHE_COLABORADOR',
        entityType: 'Employees',
        entityId: String(id),
        detailsJson: {
          employeeId: detail.id,
          registration: detail.registration,
          department: detail.department
        }
      });
    } catch (auditErr) {
      console.error('Falha não-bloqueante ao registrar auditoria de detalhe:', auditErr.message);
    }

    return res.json(detail);
  } catch (error) {
    console.error('Erro ao consultar detalhe do colaborador:', error);
    return res.status(500).json({ error: 'Erro interno ao consultar detalhes do colaborador.' });
  }
}

/**
 * POST /api/retention/employees/:id/follow-ups
 * Registra uma ação de acompanhamento para o colaborador (apenas perfil rh)
 */
async function addFollowUp(req, res) {
  try {
    const { id } = req.params;
    const { actionType, note } = req.body;

    if (!actionType || typeof actionType !== 'string') {
      return res.status(400).json({ error: 'Tipo de ação é obrigatório.' });
    }

    if (!note || typeof note !== 'string' || !note.trim()) {
      return res.status(400).json({ error: 'Nota de acompanhamento é obrigatória.' });
    }

    if (note.length > 500) {
      return res.status(400).json({ error: 'Nota excede o limite máximo de 500 caracteres.' });
    }

    const followUp = await retentionService.addFollowUp(id, req.user.id, actionType, note.trim());

    // Auditoria
    try {
      await auditLogRepository.log({
        userId: req.user?.id,
        action: 'REGISTRO_ACOMPANHAMENTO',
        entityType: 'Employees',
        entityId: String(id),
        detailsJson: { actionType }
      });
    } catch (auditErr) {
      console.error('Falha não-bloqueante ao registrar auditoria de follow-up:', auditErr.message);
    }

    return res.status(201).json(followUp);
  } catch (error) {
    console.error('Erro ao registrar acompanhamento:', error);
    return res.status(500).json({ error: 'Erro interno ao salvar acompanhamento.' });
  }
}

/**
 * POST /api/retention/recalculate
 * Dispara recálculo manual do índice de atenção
 */
async function recalculate(req, res) {
  try {
    const { employees } = await retentionService.computeRetentionAttentionIndex();

    return res.json({
      success: true,
      message: 'Índice de atenção recalculado com sucesso.',
      recalculatedAt: new Date().toISOString(),
      totalAnalyzed: employees.length
    });
  } catch (error) {
    console.error('Erro ao recalcular índices:', error);
    return res.status(500).json({ error: 'Erro interno ao recalcular índices de atenção.' });
  }
}

module.exports = {
  getEmployees,
  getEmployeeById,
  addFollowUp,
  recalculate,
  getSummary,
  getConfig,
  getGabaritoComparison
};
