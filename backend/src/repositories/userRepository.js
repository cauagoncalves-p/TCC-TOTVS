// backend/src/repositories/userRepository.js
const { poolPromise } = require('../config/db');

/**
 * Normaliza os campos do usuário a partir do recordset
 */
function normalizeUser(row) {
  if (!row) return undefined;
  return {
    Id: row.Id !== undefined ? row.Id : row.id,
    Email: row.Email !== undefined ? row.Email : row.email,
    PasswordHash: row.PasswordHash !== undefined ? row.PasswordHash : row.password_hash,
    Role: row.Role !== undefined ? row.Role : row.role,
    IsActive: row.IsActive !== undefined ? (row.IsActive === 1 || row.IsActive === true) : true,
    MustChangePassword: row.MustChangePassword !== undefined ? (row.MustChangePassword === 1 || row.MustChangePassword === true) : false,
    LastLoginAt: row.LastLoginAt !== undefined ? row.LastLoginAt : row.last_login_at,
    CreatedAt: row.CreatedAt !== undefined ? row.CreatedAt : row.created_at
  };
}

/**
 * Busca um usuário pelo e-mail
 * @param {string} email
 * @returns {Promise<Object|undefined>}
 */
async function findByEmail(email) {
  if (!email) return undefined;
  const pool = await poolPromise;
  const result = await pool.request()
    .input('email', email.trim().toLowerCase())
    .query(`
      SELECT 
        Id, 
        Email, 
        PasswordHash, 
        Role,
        ISNULL(IsActive, 1) AS IsActive,
        ISNULL(MustChangePassword, 0) AS MustChangePassword,
        LastLoginAt,
        CreatedAt
      FROM dbo.Users 
      WHERE LOWER(Email) = @email
    `);
  return normalizeUser(result.recordset[0]);
}

/**
 * Busca um usuário pelo ID
 * @param {number} id
 * @returns {Promise<Object|undefined>}
 */
async function findById(id) {
  if (!id) return undefined;
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', id)
    .query(`
      SELECT 
        Id, 
        Email, 
        PasswordHash, 
        Role,
        ISNULL(IsActive, 1) AS IsActive,
        ISNULL(MustChangePassword, 0) AS MustChangePassword,
        LastLoginAt,
        CreatedAt
      FROM dbo.Users 
      WHERE Id = @id
    `);
  return normalizeUser(result.recordset[0]);
}

/**
 * Atualiza o LastLoginAt do usuário para a data/hora atual (UTC)
 * @param {number} id
 */
async function updateLastLogin(id) {
  const pool = await poolPromise;
  await pool.request()
    .input('id', id)
    .query('UPDATE dbo.Users SET LastLoginAt = SYSUTCDATETIME() WHERE Id = @id');
}

/**
 * Atualiza senha e define/zera MustChangePassword
 * @param {number} id
 * @param {string} passwordHash
 * @param {number} mustChangePassword (0 ou 1)
 */
async function updatePassword(id, passwordHash, mustChangePassword = 0) {
  const pool = await poolPromise;
  await pool.request()
    .input('id', id)
    .input('hash', passwordHash)
    .input('mustChange', mustChangePassword ? 1 : 0)
    .query(`
      UPDATE dbo.Users 
      SET PasswordHash = @hash, 
          MustChangePassword = @mustChange 
      WHERE Id = @id
    `);
}

/**
 * Cria um novo usuário
 * @param {Object} params { email, passwordHash, role, isActive, mustChangePassword }
 * @returns {Promise<number>} ID do usuário criado
 */
async function createUser({ email, passwordHash, role, isActive = 1, mustChangePassword = 1 }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('email', email.trim().toLowerCase())
    .input('hash', passwordHash)
    .input('role', role)
    .input('isActive', isActive ? 1 : 0)
    .input('mustChange', mustChangePassword ? 1 : 0)
    .query(`
      INSERT INTO dbo.Users (Email, PasswordHash, Role, IsActive, MustChangePassword, CreatedAt)
      OUTPUT INSERTED.Id
      VALUES (@email, @hash, @role, @isActive, @mustChange, SYSUTCDATETIME())
    `);
  return result.recordset[0].Id;
}

/**
 * Atualiza role e/ou isActive de um usuário
 * @param {number} id
 * @param {Object} params { role, isActive }
 */
async function updateUser(id, { role, isActive }) {
  const pool = await poolPromise;
  const req = pool.request().input('id', id);

  const updates = [];
  if (role !== undefined) {
    req.input('role', role);
    updates.push('Role = @role');
  }
  if (isActive !== undefined) {
    req.input('isActive', isActive ? 1 : 0);
    updates.push('IsActive = @isActive');
  }

  if (updates.length === 0) return;

  await req.query(`UPDATE dbo.Users SET ${updates.join(', ')} WHERE Id = @id`);
}

/**
 * Conta usuários ativos com um determinado role, excluindo opcionalmente um ID
 * @param {string} role
 * @param {number|null} excludeUserId
 * @returns {Promise<number>}
 */
async function countActiveUsersByRole(role, excludeUserId = null) {
  const pool = await poolPromise;
  const req = pool.request().input('role', role);
  let sql = 'SELECT COUNT(*) AS total FROM dbo.Users WHERE Role = @role AND IsActive = 1';
  if (excludeUserId) {
    req.input('excludeId', excludeUserId);
    sql += ' AND Id != @excludeId';
  }
  const result = await req.query(sql);
  return result.recordset[0]?.total || 0;
}

/**
 * Lista usuários para o painel administrativo com paginação e filtros
 */
async function listUsers({ search, role, active, limit = 20, offset = 0 } = {}) {
  const pool = await poolPromise;
  const req = pool.request()
    .input('limit', limit)
    .input('offset', offset);

  const whereClauses = ['1=1'];

  if (search) {
    req.input('searchPattern', `%${search.trim()}%`);
    whereClauses.push('(u.Email LIKE @searchPattern OR e.FullName LIKE @searchPattern OR e.Registration LIKE @searchPattern)');
  }

  if (role) {
    req.input('role', role.trim());
    whereClauses.push('u.Role = @role');
  }

  if (active !== undefined && active !== null) {
    req.input('active', active ? 1 : 0);
    whereClauses.push('ISNULL(u.IsActive, 1) = @active');
  }

  const whereStr = whereClauses.join(' AND ');

  const countResult = await req.query(`
    SELECT COUNT(*) AS total
    FROM dbo.Users u
    LEFT JOIN dbo.Employees e ON e.UserId = u.Id
    WHERE ${whereStr}
  `);
  const total = countResult.recordset[0]?.total || 0;

  const listResult = await req.query(`
    SELECT 
      u.Id,
      u.Email,
      u.Role,
      ISNULL(u.IsActive, 1) AS IsActive,
      ISNULL(u.MustChangePassword, 0) AS MustChangePassword,
      u.LastLoginAt,
      u.CreatedAt,
      e.Id AS EmployeeId,
      e.FullName AS EmployeeName,
      e.Registration AS EmployeeRegistration,
      e.JobTitle AS EmployeeJobTitle,
      e.Department AS EmployeeDepartment,
      e.Status AS EmployeeStatus
    FROM dbo.Users u
    LEFT JOIN dbo.Employees e ON e.UserId = u.Id
    WHERE ${whereStr}
    ORDER BY u.CreatedAt DESC, u.Id DESC
    OFFSET @offset ROWS
    FETCH NEXT @limit ROWS ONLY
  `);

  const users = listResult.recordset.map(row => ({
    id: row.Id,
    email: row.Email,
    role: row.Role,
    isActive: Boolean(row.IsActive),
    mustChangePassword: Boolean(row.MustChangePassword),
    lastLoginAt: row.LastLoginAt,
    createdAt: row.CreatedAt,
    employee: row.EmployeeId ? {
      id: row.EmployeeId,
      fullName: row.EmployeeName,
      registration: row.EmployeeRegistration,
      jobTitle: row.EmployeeJobTitle,
      department: row.EmployeeDepartment,
      status: row.EmployeeStatus
    } : null
  }));

  return { users, total };
}

module.exports = {
  findByEmail,
  findById,
  updateLastLogin,
  updatePassword,
  createUser,
  updateUser,
  countActiveUsersByRole,
  listUsers
};
