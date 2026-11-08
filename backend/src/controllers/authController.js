// backend/src/controllers/authController.js
const authService = require('../services/authService');

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    const token = await authService.login(email, password);
    return res.json({ token });
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }
};
