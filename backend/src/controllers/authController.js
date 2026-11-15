// backend/src/controllers/authController.js
const authService = require('../services/authService');

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    const { token, mustChangePassword } = await authService.login(email, password);
    return res.json({ token, mustChangePassword });
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias.' });
  }

  try {
    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};
