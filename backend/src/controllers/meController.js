// backend/src/controllers/meController.js
const employeeService = require('../services/employeeService');

exports.getProfile = async (req, res) => {
  try {
    const profile = await employeeService.getProfile(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Perfil do colaborador não encontrado' });
    }
    return res.json({
      FullName: profile.FullName,
      JobTitle: profile.JobTitle,
      Department: profile.Department,
      HireDate: profile.HireDate
    });
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
