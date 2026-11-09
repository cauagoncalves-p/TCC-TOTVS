// backend/src/services/alertService.js
const alertRepository = require('../repositories/alertRepository');
const riskRulesService = require('./riskRulesService');

/**
 * Recalcula e gera alertas a partir do motor de regras
 */
async function generateAlerts() {
  return await riskRulesService.evaluateAll();
}

/**
 * Lista alertas com filtros
 * @param {Object} filters { status, risk, departmentId }
 */
async function listAlerts(filters) {
  return await alertRepository.list(filters);
}

/**
 * Atualiza o status de um alerta ('lido' ou 'resolvido')
 * @param {number} id
 * @param {string} status
 * @param {number} userId
 */
async function updateAlertStatus(id, status, userId) {
  const allowed = ['lido', 'resolvido'];
  if (!status || !allowed.includes(status)) {
    const error = new Error(`Status inválido. Valores aceitos: ${allowed.join(', ')}.`);
    error.status = 400;
    throw error;
  }

  const existing = await alertRepository.getById(id);
  if (!existing) {
    const error = new Error('Alerta não encontrado.');
    error.status = 404;
    throw error;
  }

  return await alertRepository.updateStatus(id, { status, updatedBy: userId });
}

module.exports = {
  generateAlerts,
  listAlerts,
  updateAlertStatus
};
