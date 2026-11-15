// backend/src/services/authService.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const userRepository = require('../repositories/userRepository');
const auditLogRepository = require('../repositories/auditLogRepository');
const authMiddleware = require('../middlewares/authMiddleware');

const COMMON_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', 'password', 'password1',
  'senha123', 'admin123', 'totvs123', 'mudar123', 'trocar123',
  'qwerty123', 'brasil123', '12345678a', 'abcdef123'
]);

/**
 * Valida a política de senha do sistema
 * (mínimo 8 caracteres, letras e números, fora da lista de senhas comuns)
 * @param {string} password
 */
function validatePasswordPolicy(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('A nova senha é obrigatória.');
  }

  if (password.length < 8) {
    throw new Error('A nova senha deve ter no mínimo 8 caracteres.');
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase().trim())) {
    throw new Error('Senha muito comum ou previsível. Escolha uma senha mais segura.');
  }

  const hasLetters = /[a-zA-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);

  if (!hasLetters || !hasNumbers) {
    throw new Error('A nova senha deve conter ao menos letras e números.');
  }
}

/**
 * Autentica o usuário e devolve o token JWT com { id, role } e o status mustChangePassword
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token: string, mustChangePassword: boolean}>}
 */
async function login(email, password) {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new Error('Credenciais inválidas');
  }

  // Recusar usuário inativo com a mesma mensagem genérica de credencial inválida
  if (!user.IsActive) {
    throw new Error('Credenciais inválidas');
  }

  const hash = user.PasswordHash || '';
  const match = await bcrypt.compare(password, hash);
  if (!match) {
    throw new Error('Credenciais inválidas');
  }

  const payload = {
    id: user.Id,
    role: user.Role || 'colaborador'
  };

  const secret = process.env.JWT_SECRET || 'TotvsRhInteligenteSuperSecretKey2026!';
  const token = jwt.sign(payload, secret, { expiresIn: '8h' });

  // Atualizar LastLoginAt no sucesso
  try {
    await userRepository.updateLastLogin(user.Id);
  } catch (err) {
    console.error('Erro ao registrar LastLoginAt:', err.message);
  }

  return {
    token,
    mustChangePassword: Boolean(user.MustChangePassword)
  };
}

/**
 * Realiza a troca de senha do próprio usuário autenticado
 * @param {number} userId
 * @param {string} currentPassword
 * @param {string} newPassword
 */
async function changePassword(userId, currentPassword, newPassword) {
  if (!currentPassword) {
    throw new Error('A senha atual é obrigatória.');
  }

  validatePasswordPolicy(newPassword);

  const user = await userRepository.findById(userId);
  if (!user) {
    throw new Error('Usuário não encontrado.');
  }

  const hash = user.PasswordHash || '';
  const matchCurrent = await bcrypt.compare(currentPassword, hash);
  if (!matchCurrent) {
    throw new Error('Senha atual incorreta.');
  }

  const isSame = await bcrypt.compare(newPassword, hash);
  if (isSame) {
    throw new Error('A nova senha deve ser diferente da senha atual.');
  }

  const newHash = await bcrypt.hash(newPassword, 10);

  // Atualiza senha e zera MustChangePassword
  await userRepository.updatePassword(userId, newHash, 0);

  // Invalida cache do usuário em memória
  authMiddleware.invalidateUserCache(userId);

  // Auditoria no ComplianceAuditLog (sem senhas nem hashes)
  await auditLogRepository.log({
    userId,
    action: 'password_changed',
    entityType: 'user',
    entityId: String(userId),
    detailsJson: {
      message: 'Senha alterada pelo próprio usuário'
    }
  });

  return { message: 'Senha alterada com sucesso.' };
}

module.exports = {
  login,
  changePassword,
  validatePasswordPolicy
};
