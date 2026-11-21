// backend/src/routes/tickets.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const ticketController = require('../controllers/ticketController');

// Todas as rotas de tickets exigem autenticação JWT
router.use(authMiddleware);

// Bloqueia gestores globalmente no módulo de chamados (403)
router.use((req, res, next) => {
  if (req.user && req.user.role === 'gestor') {
    return res.status(403).json({
      error: 'Acesso negado: gestores não possuem acesso ao módulo de chamados de suporte.'
    });
  }
  next();
});

// 1. POST /api/tickets - Cria chamado e 1ª mensagem (colaborador)
router.post('/', requireRole('colaborador'), ticketController.createTicket);

// 2. GET /api/tickets/mine - Lista os próprios chamados (colaborador)
router.get('/mine', requireRole('colaborador'), ticketController.listMyTickets);

// 3. GET /api/tickets/counts - Contagens para os selos do menu (RH)
router.get('/counts', requireRole('rh'), ticketController.getCounts);

// 4. GET /api/tickets - Fila de todos os chamados (RH)
router.get('/', requireRole('rh'), ticketController.listAllTickets);

// 5. GET /api/tickets/:id - Detalhes do chamado + mensagens (dono colaborador ou RH)
router.get('/:id', ticketController.getTicketById);

// 6. POST /api/tickets/:id/messages - Responde em um chamado existente (dono ou RH)
router.post('/:id/messages', ticketController.addMessage);

// 7. PATCH /api/tickets/:id/assign - Assume ou libera o chamado (RH)
router.patch('/:id/assign', requireRole('rh'), ticketController.assignTicket);

// 8. PATCH /api/tickets/:id/resolve - Marca o chamado como resolvido (dono ou RH)
router.patch('/:id/resolve', ticketController.resolveTicket);

module.exports = router;
