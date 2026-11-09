// backend/src/controllers/analyticsController.js
const analyticsService = require('../services/analyticsService');

exports.getDepartments = async (req, res) => {
  try {
    const departments = await analyticsService.getDepartments();
    return res.json({ departments });
  } catch (err) {
    console.error('Erro ao listar departamentos:', err);
    return res.status(500).json({ error: 'Erro interno ao listar departamentos.' });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const { from, to, departmentId } = req.query;
    const summary = await analyticsService.getSummary({
      from,
      to,
      departmentId: departmentId ? parseInt(departmentId, 10) : undefined
    });
    return res.json(summary);
  } catch (err) {
    console.error('Erro ao obter resumo de analytics:', err);
    return res.status(500).json({ error: 'Erro interno ao obter resumo de analytics.' });
  }
};

exports.getTimeseries = async (req, res) => {
  try {
    const { from, to, departmentId } = req.query;
    const timeseries = await analyticsService.getTimeseries({
      from,
      to,
      departmentId: departmentId ? parseInt(departmentId, 10) : undefined
    });
    return res.json({ timeseries });
  } catch (err) {
    console.error('Erro ao obter série temporal:', err);
    return res.status(500).json({ error: 'Erro interno ao obter série temporal.' });
  }
};

exports.getByDepartment = async (req, res) => {
  try {
    const { month } = req.query;
    const departmentsMetrics = await analyticsService.getByDepartment(month);
    return res.json({
      month: month || departmentsMetrics[0]?.MonthRef || null,
      departments: departmentsMetrics
    });
  } catch (err) {
    console.error('Erro ao obter métricas por departamento:', err);
    return res.status(500).json({ error: 'Erro interno ao obter comparativo de departamentos.' });
  }
};

exports.getHotspots = async (req, res) => {
  try {
    const hotspots = await analyticsService.getHotspots();
    return res.json({ hotspots });
  } catch (err) {
    console.error('Erro ao obter hotspots:', err);
    return res.status(500).json({ error: 'Erro interno ao obter ranking de risco.' });
  }
};
