// backend/src/controllers/adminUserController.js
const adminUserService = require('../services/adminUserService');

/**
 * GET /api/admin/users
 */
exports.listUsers = async (req, res) => {
  try {
    const { search, role, active, page, limit } = req.query;
    const result = await adminUserService.listUsers({ search, role, active, page, limit });
    return res.json(result);
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message || 'Erro interno ao listar usuários' });
  }
};

/**
 * POST /api/admin/users
 */
exports.createUser = async (req, res) => {
  try {
    const { employeeId, email, role } = req.body;
    const result = await adminUserService.createUser({
      adminUserId: req.user.id,
      employeeId,
      email,
      role
    });
    return res.status(201).json(result);
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    const status = err.statusCode || 400;
    return res.status(status).json({ error: err.message });
  }
};

/**
 * PATCH /api/admin/users/:id
 */
exports.updateUser = async (req, res) => {
  try {
    const { role, isActive } = req.body;
    const result = await adminUserService.updateUser({
      adminUserId: req.user.id,
      targetUserId: req.params.id,
      role,
      isActive
    });
    return res.json(result);
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    const status = err.statusCode || 400;
    return res.status(status).json({ error: err.message });
  }
};

/**
 * POST /api/admin/users/:id/reset-password
 */
exports.resetPassword = async (req, res) => {
  try {
    const result = await adminUserService.resetPassword({
      adminUserId: req.user.id,
      targetUserId: req.params.id
    });
    return res.json(result);
  } catch (err) {
    console.error('Erro ao resetar senha do usuário:', err);
    const status = err.statusCode || 400;
    return res.status(status).json({ error: err.message });
  }
};
