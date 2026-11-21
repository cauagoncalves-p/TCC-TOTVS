// backend/src/repositories/ticketRepository.js
const sql = require('mssql');
const { poolPromise } = require('../config/db');

/**
 * Conta os chamados em aberto (não resolvidos) de um colaborador
 * @param {number} requesterUserId
 * @returns {Promise<number>}
 */
async function countOpenTicketsByRequester(requesterUserId) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('userId', requesterUserId)
    .query(`
      SELECT COUNT(*) AS total
      FROM dbo.SupportTickets
      WHERE RequesterUserId = @userId
        AND Status IN ('aberto', 'em_atendimento', 'respondido')
    `);
  return result.recordset[0]?.total || 0;
}

/**
 * Conta os chamados criados hoje pelo colaborador (em UTC)
 * @param {number} requesterUserId
 * @returns {Promise<number>}
 */
async function countCreatedTodayByRequester(requesterUserId) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('userId', requesterUserId)
    .query(`
      SELECT COUNT(*) AS total
      FROM dbo.SupportTickets
      WHERE RequesterUserId = @userId
        AND CreatedAt >= CAST(SYSUTCDATETIME() AS DATE)
    `);
  return result.recordset[0]?.total || 0;
}

/**
 * Cria o chamado e a primeira mensagem em uma única transação
 * @param {Object} params
 * @param {number} params.requesterUserId
 * @param {string} params.subject
 * @param {string} params.category
 * @param {string} params.message
 * @param {string|null} params.sessionId
 * @returns {Promise<{ ticket: Object, initialMessage: Object }>}
 */
async function createTicketWithInitialMessage({ requesterUserId, subject, category, message, sessionId = null }) {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const ticketReq = new sql.Request(transaction);
    ticketReq.input('requesterUserId', requesterUserId);
    ticketReq.input('subject', subject.trim());
    ticketReq.input('category', category);
    ticketReq.input('sessionId', sessionId || null);

    const ticketRes = await ticketReq.query(`
      INSERT INTO dbo.SupportTickets (
        RequesterUserId, Subject, Category, Status, AssignedTo, SessionId,
        CreatedAt, UpdatedAt, LastMessageAt, LastMessageRole
      )
      OUTPUT 
        INSERTED.Id,
        INSERTED.RequesterUserId,
        INSERTED.Subject,
        INSERTED.Category,
        INSERTED.Status,
        INSERTED.AssignedTo,
        INSERTED.SessionId,
        INSERTED.CreatedAt,
        INSERTED.UpdatedAt,
        INSERTED.LastMessageAt,
        INSERTED.LastMessageRole
      VALUES (
        @requesterUserId,
        @subject,
        @category,
        'aberto',
        NULL,
        @sessionId,
        SYSUTCDATETIME(),
        SYSUTCDATETIME(),
        SYSUTCDATETIME(),
        'colaborador'
      )
    `);

    const ticket = ticketRes.recordset[0];

    const msgReq = new sql.Request(transaction);
    msgReq.input('ticketId', ticket.Id);
    msgReq.input('authorUserId', requesterUserId);
    msgReq.input('content', message.trim());

    const msgRes = await msgReq.query(`
      INSERT INTO dbo.TicketMessages (
        TicketId, AuthorUserId, AuthorRole, Content, CreatedAt
      )
      OUTPUT 
        INSERTED.Id,
        INSERTED.TicketId,
        INSERTED.AuthorUserId,
        INSERTED.AuthorRole,
        INSERTED.Content,
        INSERTED.CreatedAt
      VALUES (
        @ticketId,
        @authorUserId,
        'colaborador',
        @content,
        SYSUTCDATETIME()
      )
    `);

    const initialMessage = msgRes.recordset[0];

    await transaction.commit();

    return { ticket, initialMessage };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

/**
 * Lista os próprios chamados do colaborador
 * @param {Object} params
 * @param {number} params.requesterUserId
 * @param {string} [params.status]
 * @param {number} [params.page=1]
 * @param {number} [params.limit=10]
 * @returns {Promise<{ tickets: Object[], total: number }>}
 */
async function listTicketsByRequester({ requesterUserId, status, page = 1, limit = 10 }) {
  const pool = await poolPromise;
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const safeLimit = Math.max(1, parseInt(limit, 10));

  const req = pool.request();
  req.input('requesterUserId', requesterUserId);
  req.input('offset', offset);
  req.input('limit', safeLimit);

  let whereClause = 't.RequesterUserId = @requesterUserId';
  if (status) {
    req.input('status', status);
    whereClause += ' AND t.Status = @status';
  }

  const countRes = await req.query(`
    SELECT COUNT(*) AS total
    FROM dbo.SupportTickets t
    WHERE ${whereClause}
  `);
  const total = countRes.recordset[0]?.total || 0;

  const listRes = await req.query(`
    SELECT 
      t.Id,
      t.RequesterUserId,
      t.Subject,
      t.Category,
      t.Status,
      t.AssignedTo,
      COALESCE(eAssigned.FullName, uAssigned.Email) AS AssignedToName,
      t.SessionId,
      t.CreatedAt,
      t.UpdatedAt,
      t.LastMessageAt,
      t.LastMessageRole,
      t.ResolvedAt,
      t.ResolvedBy
    FROM dbo.SupportTickets t
    LEFT JOIN dbo.Users uAssigned ON uAssigned.Id = t.AssignedTo
    LEFT JOIN dbo.Employees eAssigned ON eAssigned.UserId = uAssigned.Id
    WHERE ${whereClause}
    ORDER BY t.LastMessageAt DESC, t.Id DESC
    OFFSET @offset ROWS
    FETCH NEXT @limit ROWS ONLY
  `);

  return { tickets: listRes.recordset, total };
}

/**
 * Fila de todos os chamados para o perfil RH
 * @param {Object} params
 * @param {string} [params.status]
 * @param {string} [params.category]
 * @param {string} [params.assigned]
 * @param {number} [params.rhUserId]
 * @param {string} [params.q]
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @returns {Promise<{ tickets: Object[], total: number }>}
 */
async function listAllTicketsForRh({ status, category, assigned, rhUserId, q, page = 1, limit = 20 }) {
  const pool = await poolPromise;
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  const safeLimit = Math.max(1, parseInt(limit, 10));

  const req = pool.request();
  req.input('offset', offset);
  req.input('limit', safeLimit);

  const conditions = [];

  if (status) {
    req.input('status', status);
    conditions.push('t.Status = @status');
  }

  if (category) {
    req.input('category', category);
    conditions.push('t.Category = @category');
  }

  if (assigned === 'me' && rhUserId) {
    req.input('assignedMe', rhUserId);
    conditions.push('t.AssignedTo = @assignedMe');
  } else if (assigned === 'none') {
    conditions.push('t.AssignedTo IS NULL');
  } else if (assigned && !isNaN(Number(assigned))) {
    req.input('assignedToId', Number(assigned));
    conditions.push('t.AssignedTo = @assignedToId');
  }

  if (q && q.trim()) {
    req.input('searchTerm', `%${q.trim()}%`);
    conditions.push('(t.Subject LIKE @searchTerm OR eReq.FullName LIKE @searchTerm OR uReq.Email LIKE @searchTerm)');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await req.query(`
    SELECT COUNT(*) AS total
    FROM dbo.SupportTickets t
    JOIN dbo.Users uReq ON uReq.Id = t.RequesterUserId
    LEFT JOIN dbo.Employees eReq ON eReq.UserId = uReq.Id
    ${whereClause}
  `);
  const total = countRes.recordset[0]?.total || 0;

  const listRes = await req.query(`
    SELECT 
      t.Id,
      t.RequesterUserId,
      COALESCE(eReq.FullName, uReq.Email) AS RequesterName,
      eReq.Department AS RequesterDepartment,
      t.Subject,
      t.Category,
      t.Status,
      t.AssignedTo,
      COALESCE(eAssigned.FullName, uAssigned.Email) AS AssignedToName,
      t.SessionId,
      t.CreatedAt,
      t.UpdatedAt,
      t.LastMessageAt,
      t.LastMessageRole,
      t.ResolvedAt,
      t.ResolvedBy
    FROM dbo.SupportTickets t
    JOIN dbo.Users uReq ON uReq.Id = t.RequesterUserId
    LEFT JOIN dbo.Employees eReq ON eReq.UserId = uReq.Id
    LEFT JOIN dbo.Users uAssigned ON uAssigned.Id = t.AssignedTo
    LEFT JOIN dbo.Employees eAssigned ON eAssigned.UserId = uAssigned.Id
    ${whereClause}
    ORDER BY 
      CASE WHEN t.Status = 'aberto' THEN 0 
           WHEN t.Status = 'em_atendimento' THEN 1 
           WHEN t.Status = 'respondido' THEN 2 
           ELSE 3 END ASC,
      t.LastMessageAt DESC,
      t.Id DESC
    OFFSET @offset ROWS
    FETCH NEXT @limit ROWS ONLY
  `);

  return { tickets: listRes.recordset, total };
}

/**
 * Contagens para os selos de chamados do RH
 * @param {number} rhUserId
 * @returns {Promise<Object>}
 */
async function getTicketCountsForRh(rhUserId) {
  const pool = await poolPromise;
  const req = pool.request();
  req.input('rhUserId', rhUserId);

  const res = await req.query(`
    SELECT
      COUNT(CASE WHEN Status = 'aberto' AND AssignedTo IS NULL THEN 1 END) AS openUnassigned,
      COUNT(CASE WHEN AssignedTo = @rhUserId AND Status <> 'resolvido' THEN 1 END) AS myAssigned,
      COUNT(CASE WHEN Status = 'respondido' THEN 1 END) AS answered,
      COUNT(CASE WHEN Status = 'resolvido' THEN 1 END) AS resolved,
      COUNT(*) AS total
    FROM dbo.SupportTickets
  `);

  const row = res.recordset[0] || {};
  return {
    openUnassigned: row.openUnassigned || 0,
    myAssigned: row.myAssigned || 0,
    answered: row.answered || 0,
    resolved: row.resolved || 0,
    total: row.total || 0
  };
}

/**
 * Busca chamado por ID com dados do requisitante e do responsável
 * @param {number} ticketId
 * @returns {Promise<Object|null>}
 */
async function findById(ticketId) {
  const pool = await poolPromise;
  const res = await pool.request()
    .input('ticketId', ticketId)
    .query(`
      SELECT 
        t.Id,
        t.RequesterUserId,
        t.Subject,
        t.Category,
        t.Status,
        t.AssignedTo,
        COALESCE(eAssigned.FullName, uAssigned.Email) AS AssignedToName,
        t.SessionId,
        t.CreatedAt,
        t.UpdatedAt,
        t.LastMessageAt,
        t.LastMessageRole,
        t.ResolvedAt,
        t.ResolvedBy,
        COALESCE(eResolved.FullName, uResolved.Email) AS ResolvedByName,
        uReq.Email AS RequesterEmail,
        eReq.FullName AS RequesterFullName,
        eReq.Registration AS RequesterRegistration,
        eReq.Department AS RequesterDepartment,
        eReq.JobTitle AS RequesterJobTitle
      FROM dbo.SupportTickets t
      JOIN dbo.Users uReq ON uReq.Id = t.RequesterUserId
      LEFT JOIN dbo.Employees eReq ON eReq.UserId = uReq.Id
      LEFT JOIN dbo.Users uAssigned ON uAssigned.Id = t.AssignedTo
      LEFT JOIN dbo.Employees eAssigned ON eAssigned.UserId = uAssigned.Id
      LEFT JOIN dbo.Users uResolved ON uResolved.Id = t.ResolvedBy
      LEFT JOIN dbo.Employees eResolved ON eResolved.UserId = uResolved.Id
      WHERE t.Id = @ticketId
    `);

  return res.recordset[0] || null;
}

/**
 * Busca todas as mensagens de um chamado em ordem cronológica
 * @param {number} ticketId
 * @returns {Promise<Object[]>}
 */
async function getMessagesByTicketId(ticketId) {
  const pool = await poolPromise;
  const res = await pool.request()
    .input('ticketId', ticketId)
    .query(`
      SELECT 
        m.Id,
        m.TicketId,
        m.AuthorUserId,
        m.AuthorRole,
        m.Content,
        m.CreatedAt,
        COALESCE(e.FullName, u.Email) AS AuthorName
      FROM dbo.TicketMessages m
      JOIN dbo.Users u ON u.Id = m.AuthorUserId
      LEFT JOIN dbo.Employees e ON e.UserId = u.Id
      WHERE m.TicketId = @ticketId
      ORDER BY m.CreatedAt ASC, m.Id ASC
    `);

  return res.recordset;
}

/**
 * Adiciona uma mensagem ao chamado e atualiza estado/responsável em transação
 * @param {Object} params
 * @param {number} params.ticketId
 * @param {number} params.authorUserId
 * @param {string} params.authorRole
 * @param {string} params.content
 * @param {string} params.newStatus
 * @param {number|null} params.newAssignedTo
 * @param {boolean} [params.clearResolved=false]
 * @returns {Promise<{ message: Object, ticket: Object }>}
 */
async function addMessageAndUpdateTicket({
  ticketId,
  authorUserId,
  authorRole,
  content,
  newStatus,
  newAssignedTo,
  clearResolved = false
}) {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const msgReq = new sql.Request(transaction);
    msgReq.input('ticketId', ticketId);
    msgReq.input('authorUserId', authorUserId);
    msgReq.input('authorRole', authorRole);
    msgReq.input('content', content.trim());

    const msgRes = await msgReq.query(`
      INSERT INTO dbo.TicketMessages (
        TicketId, AuthorUserId, AuthorRole, Content, CreatedAt
      )
      OUTPUT 
        INSERTED.Id,
        INSERTED.TicketId,
        INSERTED.AuthorUserId,
        INSERTED.AuthorRole,
        INSERTED.Content,
        INSERTED.CreatedAt
      VALUES (
        @ticketId,
        @authorUserId,
        @authorRole,
        @content,
        SYSUTCDATETIME()
      )
    `);
    const message = msgRes.recordset[0];

    const ticketReq = new sql.Request(transaction);
    ticketReq.input('ticketId', ticketId);
    ticketReq.input('newStatus', newStatus);
    ticketReq.input('newAssignedTo', newAssignedTo !== undefined ? newAssignedTo : null);
    ticketReq.input('authorRole', authorRole);
    ticketReq.input('clearResolved', clearResolved ? 1 : 0);

    const ticketRes = await ticketReq.query(`
      UPDATE dbo.SupportTickets
      SET 
        Status = @newStatus,
        AssignedTo = @newAssignedTo,
        UpdatedAt = SYSUTCDATETIME(),
        LastMessageAt = SYSUTCDATETIME(),
        LastMessageRole = @authorRole,
        ResolvedAt = CASE WHEN @clearResolved = 1 THEN NULL ELSE ResolvedAt END,
        ResolvedBy = CASE WHEN @clearResolved = 1 THEN NULL ELSE ResolvedBy END
      OUTPUT 
        INSERTED.Id,
        INSERTED.RequesterUserId,
        INSERTED.Subject,
        INSERTED.Category,
        INSERTED.Status,
        INSERTED.AssignedTo,
        INSERTED.SessionId,
        INSERTED.CreatedAt,
        INSERTED.UpdatedAt,
        INSERTED.LastMessageAt,
        INSERTED.LastMessageRole,
        INSERTED.ResolvedAt,
        INSERTED.ResolvedBy
      WHERE Id = @ticketId
    `);

    const ticket = ticketRes.recordset[0];

    await transaction.commit();
    return { message, ticket };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

/**
 * Atualiza o responsável (AssignedTo) e opcionalmente o status do chamado
 * @param {Object} params
 * @param {number} params.ticketId
 * @param {number|null} params.assignedTo
 * @param {string|null} [params.newStatus]
 * @returns {Promise<Object>}
 */
async function updateAssignment({ ticketId, assignedTo, newStatus = null }) {
  const pool = await poolPromise;
  const req = pool.request();
  req.input('ticketId', ticketId);
  req.input('assignedTo', assignedTo);
  req.input('newStatus', newStatus);

  const res = await req.query(`
    UPDATE dbo.SupportTickets
    SET 
      AssignedTo = @assignedTo,
      Status = CASE WHEN @newStatus IS NOT NULL THEN @newStatus ELSE Status END,
      UpdatedAt = SYSUTCDATETIME()
    OUTPUT 
      INSERTED.Id,
      INSERTED.RequesterUserId,
      INSERTED.Subject,
      INSERTED.Category,
      INSERTED.Status,
      INSERTED.AssignedTo,
      INSERTED.SessionId,
      INSERTED.CreatedAt,
      INSERTED.UpdatedAt,
      INSERTED.LastMessageAt,
      INSERTED.LastMessageRole,
      INSERTED.ResolvedAt,
      INSERTED.ResolvedBy
    WHERE Id = @ticketId
  `);

  return res.recordset[0] || null;
}

/**
 * Marca o chamado como resolvido
 * @param {Object} params
 * @param {number} params.ticketId
 * @param {number} params.resolvedByUserId
 * @returns {Promise<Object>}
 */
async function resolveTicket({ ticketId, resolvedByUserId }) {
  const pool = await poolPromise;
  const req = pool.request();
  req.input('ticketId', ticketId);
  req.input('resolvedBy', resolvedByUserId);

  const res = await req.query(`
    UPDATE dbo.SupportTickets
    SET 
      Status = 'resolvido',
      ResolvedAt = SYSUTCDATETIME(),
      ResolvedBy = @resolvedBy,
      UpdatedAt = SYSUTCDATETIME()
    OUTPUT 
      INSERTED.Id,
      INSERTED.RequesterUserId,
      INSERTED.Subject,
      INSERTED.Category,
      INSERTED.Status,
      INSERTED.AssignedTo,
      INSERTED.SessionId,
      INSERTED.CreatedAt,
      INSERTED.UpdatedAt,
      INSERTED.LastMessageAt,
      INSERTED.LastMessageRole,
      INSERTED.ResolvedAt,
      INSERTED.ResolvedBy
    WHERE Id = @ticketId
  `);

  return res.recordset[0] || null;
}

/**
 * Lista todos os usuários RH ativos
 * @returns {Promise<Array<{ Id: number, Email: string }>>}
 */
async function findActiveRhUsers() {
  const pool = await poolPromise;
  const res = await pool.request().query(`
    SELECT Id, Email 
    FROM dbo.Users 
    WHERE Role = 'rh' AND ISNULL(IsActive, 1) = 1
  `);
  return res.recordset;
}

module.exports = {
  countOpenTicketsByRequester,
  countCreatedTodayByRequester,
  createTicketWithInitialMessage,
  listTicketsByRequester,
  listAllTicketsForRh,
  getTicketCountsForRh,
  findById,
  getMessagesByTicketId,
  addMessageAndUpdateTicket,
  updateAssignment,
  resolveTicket,
  findActiveRhUsers
};
