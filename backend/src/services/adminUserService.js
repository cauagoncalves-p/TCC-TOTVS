// backend/src/services/adminUserService.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const employeeRepository = require('../repositories/employeeRepository');
const auditLogRepository = require('../repositories/auditLogRepository');
const authMiddleware = require('../middlewares/authMiddleware');

const VALID_ROLES = ['colaborador', 'rh', 'gestor'];

/**
 * Gera uma senha temporária aleatória segura (mínimo 12 caracteres, maiúsculas, minúsculas e números)
 * @returns {string}
 */
function generateTemporaryPassword() {
  const randomHex = crypto.randomBytes(4).toString('hex');
  return `Totvs@${randomHex}A1`;
}

/**
 * Lista usuários para o painel administrativo
 */
async function listUsers({ search, role, active, page = 1, limit = 20 } = {}) {
  const numPage = Math.max(1, parseInt(page, 10) || 1);
  const numLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (numPage - 1) * numLimit;

  let activeFilter = null;
  if (active !== undefined && active !== null && active !== '') {
    activeFilter = (active === true || active === 'true' || active === 1 || active === '1');
  }

  const { users, total } = await userRepository.listUsers({
    search: search || null,
    role: role || null,
    active: activeFilter,
    limit: numLimit,
    offset
  });

  return {
    users,
    total,
    page: numPage,
    limit: numLimit,
    totalPages: Math.ceil(total / numLimit) || 1
  };
}

/**
 * Cria usuário para um colaborador sem usuário
 */
async function createUser({ adminUserId, employeeId, email, role }) {
  if (!employeeId) {
    const err = new Error('O ID do colaborador (employeeId) é obrigatório.');
    err.statusCode = 400;
    throw err;
  }

  if (!email || typeof email !== 'string') {
    const err = new Error('E-mail é obrigatório.');
    err.statusCode = 400;
    throw err;
  }

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    const err = new Error('E-mail em formato inválido.');
    err.statusCode = 400;
    throw err;
  }

  if (!role || !VALID_ROLES.includes(role)) {
    const err = new Error(`Perfil inválido. Valores permitidos: ${VALID_ROLES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  // 6. Proteção: e-mail único
  const existingUser = await userRepository.findByEmail(cleanEmail);
  if (existingUser) {
    const err = new Error('E-mail já cadastrado no sistema.');
    err.statusCode = 409;
    throw err;
  }

  // Verifica colaborador
  const employee = await employeeRepository.getById(employeeId);
  if (!employee) {
    const err = new Error('Colaborador não encontrado.');
    err.statusCode = 404;
    throw err;
  }

  if (employee.UserId) {
    const linkedUser = await userRepository.findById(employee.UserId);
    if (linkedUser) {
      const err = new Error('Este colaborador já possui um usuário vinculado.');
      err.statusCode = 400;
      throw err;
    }
  }

  // Gera senha temporária e hash
  const tempPassword = generateTemporaryPassword();
  const tempPasswordHash = await bcrypt.hash(tempPassword, 10);

  // Insere novo usuário com MustChangePassword = 1
  const newUserId = await userRepository.createUser({
    email: cleanEmail,
    passwordHash: tempPasswordHash,
    role,
    isActive: 1,
    mustChangePassword: 1
  });

  // Vincula o colaborador ao usuário criado
  await employeeRepository.updateUserId(employeeId, newUserId);

  // 7. Auditoria no ComplianceAuditLog (sem senhas nem hashes)
  await auditLogRepository.log({
    userId: adminUserId,
    action: 'user_created',
    entityType: 'user',
    entityId: String(newUserId),
    detailsJson: {
      email: cleanEmail,
      role,
      employeeId,
      mustChangePassword: true
    }
  });

  return {
    message: 'Usuário criado com sucesso.',
    user: {
      id: newUserId,
      email: cleanEmail,
      role,
      isActive: true,
      mustChangePassword: true,
      employeeId
    },
    tempPassword // Exibida uma única vez na resposta
  };
}

/**
 * Atualiza role e/ou status ativo do usuário
 */
async function updateUser({ adminUserId, targetUserId, role, isActive }) {
  const numTargetId = parseInt(targetUserId, 10);
  if (!numTargetId) {
    const err = new Error('ID de usuário inválido.');
    err.statusCode = 400;
    throw err;
  }

  if (role === undefined && isActive === undefined) {
    const err = new Error('Informe ao menos role ou isActive para atualização.');
    err.statusCode = 400;
    throw err;
  }

  const targetUser = await userRepository.findById(numTargetId);
  if (!targetUser) {
    const err = new Error('Usuário não encontrado.');
    err.statusCode = 404;
    throw err;
  }

  // 6. Proteção: ninguém altera o próprio perfil nem se inativa
  if (numTargetId === Number(adminUserId)) {
    if (role !== undefined && role !== targetUser.Role) {
      const err = new Error('Não é permitido alterar o próprio perfil de acesso.');
      err.statusCode = 403;
      throw err;
    }
    if (isActive !== undefined && (isActive === false || isActive === 0)) {
      const err = new Error('Não é permitido inativar o próprio usuário.');
      err.statusCode = 403;
      throw err;
    }
  }

  // 6. Proteção: nunca deixar o sistema sem ao menos um RH ativo
  if (targetUser.Role === 'rh') {
    const willDeactivate = (isActive === false || isActive === 0);
    const willChangeRole = (role !== undefined && role !== 'rh');

    if (willDeactivate || willChangeRole) {
      const activeRhCount = await userRepository.countActiveUsersByRole('rh', numTargetId);
      if (activeRhCount < 1) {
        const err = new Error('Operação não permitida: o sistema deve possuir pelo menos um usuário de RH ativo.');
        err.statusCode = 400;
        throw err;
      }
    }
  }

  if (role !== undefined && !VALID_ROLES.includes(role)) {
    const err = new Error(`Perfil inválido. Valores permitidos: ${VALID_ROLES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  let finalIsActive;
  if (isActive !== undefined) {
    finalIsActive = (isActive === true || isActive === 1);
  }

  await userRepository.updateUser(numTargetId, {
    role,
    isActive: finalIsActive
  });

  // Invalida cache de autorização do usuário
  authMiddleware.invalidateUserCache(numTargetId);

  // 7. Auditoria no ComplianceAuditLog
  await auditLogRepository.log({
    userId: adminUserId,
    action: 'user_updated',
    entityType: 'user',
    entityId: String(numTargetId),
    detailsJson: {
      targetEmail: targetUser.Email,
      previousRole: targetUser.Role,
      newRole: role !== undefined ? role : targetUser.Role,
      previousIsActive: targetUser.IsActive,
      newIsActive: finalIsActive !== undefined ? finalIsActive : targetUser.IsActive
    }
  });

  const updatedUser = await userRepository.findById(numTargetId);
  return {
    message: 'Usuário atualizado com sucesso.',
    user: {
      id: updatedUser.Id,
      email: updatedUser.Email,
      role: updatedUser.Role,
      isActive: Boolean(updatedUser.IsActive),
      mustChangePassword: Boolean(updatedUser.MustChangePassword),
      lastLoginAt: updatedUser.LastLoginAt
    }
  };
}

/**
 * Reseta a senha de um usuário, gerando senha temporária e definindo MustChangePassword = 1
 */
async function resetPassword({ adminUserId, targetUserId }) {
  const numTargetId = parseInt(targetUserId, 10);
  if (!numTargetId) {
    const err = new Error('ID de usuário inválido.');
    err.statusCode = 400;
    throw err;
  }

  const targetUser = await userRepository.findById(numTargetId);
  if (!targetUser) {
    const err = new Error('Usuário não encontrado.');
    err.statusCode = 404;
    throw err;
  }

  const tempPassword = generateTemporaryPassword();
  const tempPasswordHash = await bcrypt.hash(tempPassword, 10);

  // Define nova senha temporária e MustChangePassword = 1
  await userRepository.updatePassword(numTargetId, tempPasswordHash, 1);

  // Invalida cache do usuário
  authMiddleware.invalidateUserCache(numTargetId);

  // 7. Auditoria no ComplianceAuditLog (sem senhas nem hashes)
  await auditLogRepository.log({
    userId: adminUserId,
    action: 'user_password_reset',
    entityType: 'user',
    entityId: String(numTargetId),
    detailsJson: {
      message: 'Senha resetada por administrador de RH',
      targetEmail: targetUser.Email,
      mustChangePassword: true
    }
  });

  return {
    message: 'Senha resetada com sucesso.',
    tempPassword, // Exibida uma única vez na resposta
    mustChangePassword: true
  };
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  resetPassword,
  generateTemporaryPassword
};
