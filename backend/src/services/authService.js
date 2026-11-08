// backend/src/services/authService.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const userRepository = require('../repositories/userRepository');

/**
 * Autentica o usuário e devolve o token JWT com { id, role }
 * @param {string} email
 * @param {string} password
 * @returns {Promise<string>}
 */
async function login(email, password) {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new Error('Credenciais inválidas');
  }

  const hash = user.PasswordHash || user.password_hash || '';
  const match = await bcrypt.compare(password, hash);
  if (!match) {
    throw new Error('Credenciais inválidas');
  }

  const payload = {
    id: user.Id || user.id,
    role: user.Role || user.role || 'colaborador'
  };

  const secret = process.env.JWT_SECRET || 'TotvsRhInteligenteSuperSecretKey2026!';
  const token = jwt.sign(payload, secret, { expiresIn: '8h' });
  return token;
}

module.exports = { login };
