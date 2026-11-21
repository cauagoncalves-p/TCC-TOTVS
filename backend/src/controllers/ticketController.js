// backend/src/controllers/ticketController.js
const ticketService = require('../services/ticketService');

/**
 * Cria um novo chamado com mensagem inicial (colaborador)
 * POST /api/tickets
 */
async function createTicket(req, res) {
  try {
    const { subject, category, message, sessionId } = req.body || {};
    const ticket = await ticketService.createTicket(req.user, {
      subject,
      category,
      message,
      sessionId
    });
    return res.status(201).json(ticket);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Erro no ticketController.createTicket:', err);
    return res.status(500).json({ error: 'Erro interno ao criar chamado.' });
  }
}

/**
 * Lista os próprios chamados (colaborador)
 * GET /api/tickets/mine
 */
async function listMyTickets(req, res) {
  try {
    const { status, page, limit } = req.query;
    const result = await ticketService.listMyTickets(req.user, { status, page, limit });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Erro no ticketController.listMyTickets:', err);
    return res.status(500).json({ error: 'Erro interno ao listar chamados.' });
  }
}

/**
 * Fila de todos os chamados (RH)
 * GET /api/tickets
 */
async function listAllTickets(req, res) {
  try {
    const { status, category, assigned, q, page, limit } = req.query;
    const result = await ticketService.listAllTickets(req.user, {
      status,
      category,
      assigned,
      q,
      page,
      limit
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Erro no ticketController.listAllTickets:', err);
    return res.status(500).json({ error: 'Erro interno ao consultar fila de chamados.' });
  }
}

/**
 * Contagens para os selos do menu (RH)
 * GET /api/tickets/counts
 */
async function getCounts(req, res) {
  try {
    const counts = await ticketService.getTicketCounts(req.user);
    return res.status(200).json(counts);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Erro no ticketController.getCounts:', err);
    return res.status(500).json({ error: 'Erro interno ao obter contagens de chamados.' });
  }
}

/**
 * Busca chamado e mensagens por ID
 * GET /api/tickets/:id
 */
async function getTicketById(req, res) {
  try {
    const ticket = await ticketService.getTicketById(req.user, req.params.id);
    return res.status(200).json(ticket);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Erro no ticketController.getTicketById:', err);
    return res.status(500).json({ error: 'Erro interno ao buscar chamado.' });
  }
}

/**
 * Envia uma mensagem em um chamado existente
 * POST /api/tickets/:id/messages
 */
async function addMessage(req, res) {
  try {
    const { content } = req.body || {};
    const result = await ticketService.addMessage(req.user, req.params.id, { content });
    return res.status(201).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Erro no ticketController.addMessage:', err);
    return res.status(500).json({ error: 'Erro interno ao enviar mensagem.' });
  }
}

/**
 * Assume ou libera o chamado (RH)
 * PATCH /api/tickets/:id/assign
 */
async function assignTicket(req, res) {
  try {
    const { assignedTo } = req.body || {};
    const updated = await ticketService.assignTicket(req.user, req.params.id, { assignedTo });
    return res.status(200).json(updated);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Erro no ticketController.assignTicket:', err);
    return res.status(500).json({ error: 'Erro interno ao atribuir chamado.' });
  }
}

/**
 * Marca o chamado como resolvido
 * PATCH /api/tickets/:id/resolve
 */
async function resolveTicket(req, res) {
  try {
    const updated = await ticketService.resolveTicket(req.user, req.params.id);
    return res.status(200).json(updated);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Erro no ticketController.resolveTicket:', err);
    return res.status(500).json({ error: 'Erro interno ao finalizar chamado.' });
  }
}

module.exports = {
  createTicket,
  listMyTickets,
  listAllTickets,
  getCounts,
  getTicketById,
  addMessage,
  assignTicket,
  resolveTicket
};
