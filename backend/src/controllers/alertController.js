// backend/src/controllers/alertController.js
const alertService = require('../services/alertService');

exports.generate = async (req, res) => {
  try {
    const result = await alertService.generateAlerts();
    return res.status(200).json({
      message: 'Motor de regras executado com sucesso.',
      ...result
    });
  } catch (err) {
    console.error('Erro ao gerar alertas:', err);
    return res.status(500).json({ error: 'Erro interno ao processar motor de regras de alertas.' });
  }
};

exports.list = async (req, res) => {
  try {
    const { status, risk, departmentId } = req.query;
    const alerts = await alertService.listAlerts({
      status,
      risk,
      departmentId: departmentId ? parseInt(departmentId, 10) : undefined
    });
    return res.json({ alerts });
  } catch (err) {
    console.error('Erro ao listar alertas:', err);
    return res.status(500).json({ error: 'Erro interno ao listar alertas.' });
  }
};

exports.updateStatus = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;

  try {
    const updated = await alertService.updateAlertStatus(id, status, req.user.id);
    return res.json(updated);
  } catch (err) {
    const code = err.status || 500;
    return res.status(code).json({ error: err.message });
  }
};
