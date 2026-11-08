// backend/src/repositories/chatRepository.js
const { poolPromise } = require('../config/db');

/**
 * Cria uma nova sessão de chat vinculada ao usuário
 * @param {number} userId
 * @returns {Promise<string>} UUID da sessão criada
 */
async function createSession(userId) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('userId', userId)
    .query('INSERT INTO ChatSessions (UserId) OUTPUT INSERTED.Id VALUES (@userId)');
  return result.recordset[0].Id;
}

/**
 * Salva uma mensagem no histórico da sessão
 * @param {Object} params { sessionId, role, content, toolUsed }
 */
async function saveMessage({ sessionId, role, content, toolUsed }) {
  const pool = await poolPromise;
  await pool.request()
    .input('sessionId', sessionId)
    .input('role', role)
    .input('content', content)
    .input('toolUsed', toolUsed || null)
    .query('INSERT INTO ChatMessages (SessionId, Role, Content, ToolUsed) VALUES (@sessionId, @role, @content, @toolUsed)');
}

/**
 * Retorna as últimas N mensagens da sessão em ordem cronológica
 * @param {string} sessionId
 * @param {number} limit
 * @returns {Promise<Array<{Role: string, Content: string, ToolUsed: string|null, CreatedAt: Date}>>}
 */
async function getLastMessages(sessionId, limit = 10) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('sessionId', sessionId)
    .input('limit', limit)
    .query(`
      SELECT TOP (@limit) Role, Content, ToolUsed, CreatedAt
      FROM ChatMessages
      WHERE SessionId = @sessionId
      ORDER BY CreatedAt ASC
    `);
  return result.recordset;
}

/**
 * Verifica se a sessão existe e pertence ao usuário do token
 * @param {string} sessionId
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
async function isOwner(sessionId, userId) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('sessionId', sessionId)
    .input('userId', userId)
    .query('SELECT 1 FROM ChatSessions WHERE Id = @sessionId AND UserId = @userId');
  return result.recordset.length > 0;
}

module.exports = { createSession, saveMessage, getLastMessages, isOwner };
