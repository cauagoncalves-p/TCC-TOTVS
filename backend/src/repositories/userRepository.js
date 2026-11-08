// backend/src/repositories/userRepository.js
const { poolPromise } = require('../config/db');

/**
 * Busca um usuário pelo e-mail
 * @param {string} email
 * @returns {Promise<{Id: number, Email: string, PasswordHash: string, Role: string}|undefined>}
 */
async function findByEmail(email) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('email', email)
    .query('SELECT id AS Id, email AS Email, password_hash AS PasswordHash, role AS Role FROM users WHERE email = @email');
  return result.recordset[0];
}

module.exports = { findByEmail };
