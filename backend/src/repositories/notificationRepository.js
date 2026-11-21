// backend/src/repositories/notificationRepository.js
const { poolPromise } = require('../config/db');

/**
 * Insere ou reativa uma notificação na tabela dbo.Notifications.
 * Se já existir para (UserId, Type, RefType, RefId), atualiza Message, IsRead = 0 e CreatedAt.
 * Se não existir, insere uma nova notificação.
 * 
 * @param {Object} params
 * @param {number} params.userId
 * @param {string} params.type
 * @param {string} params.message
 * @param {string} params.refType
 * @param {number} params.refId
 */
async function upsertNotification({ userId, type, message, refType = 'chamado', refId }) {
  if (!userId || !type || !message) return;

  const pool = await poolPromise;
  const cleanMessage = String(message).slice(0, 300);

  await pool.request()
    .input('userId', userId)
    .input('type', type)
    .input('message', cleanMessage)
    .input('refType', refType)
    .input('refId', refId || null)
    .query(`
      MERGE dbo.Notifications AS target
      USING (SELECT @userId AS UserId, @type AS Type, @refType AS RefType, @refId AS RefId) AS source
      ON (target.UserId = source.UserId 
          AND target.Type = source.Type 
          AND target.RefType = source.RefType 
          AND target.RefId = source.RefId)
      WHEN MATCHED THEN
        UPDATE SET target.Message = @message, 
                   target.IsRead = 0, 
                   target.CreatedAt = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (UserId, Type, Message, RefType, RefId, IsRead, CreatedAt)
        VALUES (source.UserId, source.Type, @message, source.RefType, source.RefId, 0, SYSUTCDATETIME());
    `);
}

/**
 * Dispara notificação com inserir-ou-reativar para múltiplos usuários
 * @param {number[]} userIds
 * @param {Object} notifParams { type, message, refType, refId }
 */
async function upsertNotificationForUsers(userIds, { type, message, refType = 'chamado', refId }) {
  if (!Array.isArray(userIds) || userIds.length === 0) return;
  for (const uid of userIds) {
    await upsertNotification({
      userId: uid,
      type,
      message,
      refType,
      refId
    });
  }
}

module.exports = {
  upsertNotification,
  upsertNotificationForUsers
};
