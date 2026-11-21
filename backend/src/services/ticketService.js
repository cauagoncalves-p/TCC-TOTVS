// backend/src/services/ticketService.js
const ticketRepository = require('../repositories/ticketRepository');
const notificationRepository = require('../repositories/notificationRepository');
const auditLogRepository = require('../repositories/auditLogRepository');

const VALID_CATEGORIES = [
  'ferias',
  'holerite',
  'beneficios',
  'ponto',
  'documentos',
  'politicas',
  'outros'
];

const MAX_OPEN_TICKETS = 3;
const MAX_TICKETS_PER_DAY = 5;
const REOPEN_WINDOW_DAYS = 7;
const REOPEN_WINDOW_MS = REOPEN_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/**
 * Cria um novo chamado e a primeira mensagem
 */
async function createTicket(user, { subject, category, message, sessionId = null }) {
  if (user.role !== 'colaborador') {
    const err = new Error('Apenas colaboradores podem abrir chamados.');
    err.status = 403;
    throw err;
  }

  if (!subject || typeof subject !== 'string') {
    const err = new Error('O assunto é obrigatório.');
    err.status = 400;
    throw err;
  }
  const cleanSubject = subject.trim();
  if (cleanSubject.length < 5 || cleanSubject.length > 150) {
    const err = new Error('O assunto deve ter entre 5 e 150 caracteres.');
    err.status = 400;
    throw err;
  }

  if (!category || !VALID_CATEGORIES.includes(category)) {
    const err = new Error(`Categoria inválida. Categorias permitidas: ${VALID_CATEGORIES.join(', ')}.`);
    err.status = 400;
    throw err;
  }

  if (!message || typeof message !== 'string') {
    const err = new Error('A mensagem é obrigatória.');
    err.status = 400;
    throw err;
  }
  const cleanMessage = message.trim();
  if (cleanMessage.length < 10 || cleanMessage.length > 2000) {
    const err = new Error('A mensagem deve ter entre 10 e 2000 caracteres.');
    err.status = 400;
    throw err;
  }

  // 1. Limite de chamados abertos simultâneos (máximo 3)
  const openCount = await ticketRepository.countOpenTicketsByRequester(user.id);
  if (openCount >= MAX_OPEN_TICKETS) {
    const err = new Error(`Limite de ${MAX_OPEN_TICKETS} chamados em andamento atingido. Aguarde a resolução dos chamados atuais para abrir um novo.`);
    err.status = 429;
    throw err;
  }

  // 2. Limite de chamados criados no dia (máximo 5)
  const todayCount = await ticketRepository.countCreatedTodayByRequester(user.id);
  if (todayCount >= MAX_TICKETS_PER_DAY) {
    const err = new Error(`Limite diário de ${MAX_TICKETS_PER_DAY} chamados atingido. Tente novamente amanhã.`);
    err.status = 429;
    throw err;
  }

  // 3. Criação transacional
  const { ticket, initialMessage } = await ticketRepository.createTicketWithInitialMessage({
    requesterUserId: user.id,
    subject: cleanSubject,
    category,
    message: cleanMessage,
    sessionId: sessionId || null
  });

  // 4. Notificações pós-commit para todos os usuários RH ativos
  try {
    const rhUsers = await ticketRepository.findActiveRhUsers();
    const rhUserIds = rhUsers.map(u => u.Id);
    await notificationRepository.upsertNotificationForUsers(rhUserIds, {
      type: 'chamado_novo',
      message: `Novo chamado #${ticket.Id}: ${ticket.Subject}`,
      refType: 'chamado',
      refId: ticket.Id
    });
  } catch (notifErr) {
    console.error('Falha ao notificar equipe de RH sobre novo chamado:', notifErr.message);
  }

  // 5. Auditoria sem o conteúdo da mensagem
  try {
    await auditLogRepository.log({
      userId: user.id,
      action: 'ticket_created',
      entityType: 'ticket',
      entityId: ticket.Id,
      detailsJson: {
        ticketId: ticket.Id,
        category: ticket.Category,
        hasSession: Boolean(sessionId)
      }
    });
  } catch (auditErr) {
    console.error('Falha ao registrar auditoria de criação do chamado:', auditErr.message);
  }

  return {
    ...ticket,
    initialMessage
  };
}

/**
 * Lista os próprios chamados do colaborador
 */
async function listMyTickets(user, { status, page = 1, limit = 10 }) {
  if (user.role !== 'colaborador') {
    const err = new Error('Acesso restrito a colaboradores.');
    err.status = 403;
    throw err;
  }

  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));

  const { tickets, total } = await ticketRepository.listTicketsByRequester({
    requesterUserId: user.id,
    status: status || null,
    page: p,
    limit: l
  });

  return {
    tickets,
    total,
    page: p,
    limit: l,
    totalPages: Math.ceil(total / l) || 1
  };
}

/**
 * Lista todos os chamados para a equipe de RH
 */
async function listAllTickets(user, { status, category, assigned, q, page = 1, limit = 20 }) {
  if (user.role !== 'rh') {
    const err = new Error('Acesso negado: apenas o RH pode acessar a fila geral de chamados.');
    err.status = 403;
    throw err;
  }

  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

  const { tickets, total } = await ticketRepository.listAllTicketsForRh({
    status: status || null,
    category: category || null,
    assigned: assigned || null,
    rhUserId: user.id,
    q: q || null,
    page: p,
    limit: l
  });

  return {
    tickets,
    total,
    page: p,
    limit: l,
    totalPages: Math.ceil(total / l) || 1
  };
}

/**
 * Retorna contagens de chamados para os selos do RH
 */
async function getTicketCounts(user) {
  if (user.role !== 'rh') {
    const err = new Error('Acesso negado: apenas o RH pode acessar as contagens de chamados.');
    err.status = 403;
    throw err;
  }

  return ticketRepository.getTicketCountsForRh(user.id);
}

/**
 * Busca chamado e mensagens por ID com controle estrito de acesso
 */
async function getTicketById(user, ticketId) {
  const idNum = parseInt(ticketId, 10);
  if (isNaN(idNum) || idNum <= 0) {
    const err = new Error('ID do chamado inválido.');
    err.status = 400;
    throw err;
  }

  if (user.role === 'gestor') {
    const err = new Error('Acesso negado: gestores não possuem acesso ao módulo de chamados.');
    err.status = 403;
    throw err;
  }

  const ticket = await ticketRepository.findById(idNum);
  if (!ticket) {
    const err = new Error('Chamado não encontrado.');
    err.status = 404;
    throw err;
  }

  // Colaborador só vê os próprios chamados; chamado de outro colaborador deve ser 404 (não 403)
  if (user.role === 'colaborador' && ticket.RequesterUserId !== user.id) {
    const err = new Error('Chamado não encontrado.');
    err.status = 404;
    throw err;
  }

  if (user.role !== 'rh' && user.role !== 'colaborador') {
    const err = new Error('Acesso negado.');
    err.status = 403;
    throw err;
  }

  const messages = await ticketRepository.getMessagesByTicketId(idNum);

  // Formata os dados do requisitante respeitando LGPD (nunca expor salário nem CPF)
  let requester;
  if (user.role === 'rh') {
    requester = {
      id: ticket.RequesterUserId,
      email: ticket.RequesterEmail,
      fullName: ticket.RequesterFullName || ticket.RequesterEmail,
      registration: ticket.RequesterRegistration || null,
      department: ticket.RequesterDepartment || null,
      jobTitle: ticket.RequesterJobTitle || null
    };
  } else {
    requester = {
      id: ticket.RequesterUserId,
      email: ticket.RequesterEmail,
      fullName: ticket.RequesterFullName || ticket.RequesterEmail
    };
  }

  return {
    id: ticket.Id,
    subject: ticket.Subject,
    category: ticket.Category,
    status: ticket.Status,
    assignedTo: ticket.AssignedTo,
    assignedToName: ticket.AssignedToName,
    sessionId: ticket.SessionId,
    createdAt: ticket.CreatedAt,
    updatedAt: ticket.UpdatedAt,
    lastMessageAt: ticket.LastMessageAt,
    lastMessageRole: ticket.LastMessageRole,
    resolvedAt: ticket.ResolvedAt,
    resolvedBy: ticket.ResolvedBy,
    resolvedByName: ticket.ResolvedByName,
    requester,
    messages
  };
}

/**
 * Adiciona uma mensagem ao chamado, aplica transição de estado e notifica
 */
async function addMessage(user, ticketId, { content }) {
  const idNum = parseInt(ticketId, 10);
  if (isNaN(idNum) || idNum <= 0) {
    const err = new Error('ID do chamado inválido.');
    err.status = 400;
    throw err;
  }

  if (user.role === 'gestor') {
    const err = new Error('Acesso negado: gestores não possuem acesso ao módulo de chamados.');
    err.status = 403;
    throw err;
  }

  if (!content || typeof content !== 'string') {
    const err = new Error('O conteúdo da mensagem é obrigatório.');
    err.status = 400;
    throw err;
  }
  const cleanContent = content.trim();
  if (cleanContent.length < 10 || cleanContent.length > 2000) {
    const err = new Error('A mensagem deve ter entre 10 e 2000 caracteres.');
    err.status = 400;
    throw err;
  }

  const ticket = await ticketRepository.findById(idNum);
  if (!ticket) {
    const err = new Error('Chamado não encontrado.');
    err.status = 404;
    throw err;
  }

  // Colaborador alheio recebe 404
  if (user.role === 'colaborador' && ticket.RequesterUserId !== user.id) {
    const err = new Error('Chamado não encontrado.');
    err.status = 404;
    throw err;
  }

  if (user.role !== 'rh' && user.role !== 'colaborador') {
    const err = new Error('Acesso negado.');
    err.status = 403;
    throw err;
  }

  // Validação de chamado resolvido
  let clearResolved = false;
  if (ticket.Status === 'resolvido') {
    if (user.role === 'colaborador') {
      const resolvedAtTime = ticket.ResolvedAt ? new Date(ticket.ResolvedAt).getTime() : 0;
      const nowTime = Date.now();
      if (nowTime - resolvedAtTime > REOPEN_WINDOW_MS) {
        const err = new Error('Este chamado foi resolvido há mais de 7 dias e não pode mais receber mensagens. Por favor, abra um novo chamado.');
        err.status = 409;
        throw err;
      }
    }
    clearResolved = true;
  }

  // Regras de transição de estado
  let newStatus;
  let newAssignedTo = ticket.AssignedTo;

  if (user.role === 'colaborador') {
    // Colaborador respondeu: passa para aberto
    newStatus = 'aberto';
  } else if (user.role === 'rh') {
    // RH respondeu: passa para respondido
    newStatus = 'respondido';
    // Se não tiver responsável, o RH que respondeu assume automaticamente
    if (!newAssignedTo) {
      newAssignedTo = user.id;
    }
  }

  // Executa transação de gravação de mensagem e atualização de chamado
  const result = await ticketRepository.addMessageAndUpdateTicket({
    ticketId: idNum,
    authorUserId: user.id,
    authorRole: user.role,
    content: cleanContent,
    newStatus,
    newAssignedTo,
    clearResolved
  });

  // Notificações pós-commit
  try {
    if (user.role === 'colaborador') {
      // Colaborador respondeu: notifica o RH responsável ou todos os RH se não houver
      if (newAssignedTo) {
        await notificationRepository.upsertNotification({
          userId: newAssignedTo,
          type: 'chamado_mensagem',
          message: `Nova mensagem no chamado #${ticket.Id}`,
          refType: 'chamado',
          refId: ticket.Id
        });
      } else {
        const rhUsers = await ticketRepository.findActiveRhUsers();
        await notificationRepository.upsertNotificationForUsers(rhUsers.map(u => u.Id), {
          type: 'chamado_mensagem',
          message: `Nova mensagem no chamado #${ticket.Id}`,
          refType: 'chamado',
          refId: ticket.Id
        });
      }
    } else if (user.role === 'rh') {
      // RH respondeu: notifica o colaborador requisitante
      await notificationRepository.upsertNotification({
        userId: ticket.RequesterUserId,
        type: 'chamado_respondido',
        message: `Seu chamado #${ticket.Id} foi respondido pelo RH`,
        refType: 'chamado',
        refId: ticket.Id
      });
    }
  } catch (notifErr) {
    console.error('Falha ao enviar notificação de nova mensagem:', notifErr.message);
  }

  // Auditoria sem o conteúdo da mensagem
  try {
    await auditLogRepository.log({
      userId: user.id,
      action: 'ticket_message_added',
      entityType: 'ticket',
      entityId: ticket.Id,
      detailsJson: {
        ticketId: ticket.Id,
        authorRole: user.role,
        previousStatus: ticket.Status,
        newStatus,
        assignedTo: newAssignedTo
      }
    });
  } catch (auditErr) {
    console.error('Falha ao registrar auditoria de mensagem no chamado:', auditErr.message);
  }

  return result;
}

/**
 * Assume ou libera um chamado (somente RH)
 */
async function assignTicket(user, ticketId, { assignedTo }) {
  if (user.role !== 'rh') {
    const err = new Error('Acesso negado: apenas o RH pode assumir ou liberar chamados.');
    err.status = 403;
    throw err;
  }

  const idNum = parseInt(ticketId, 10);
  if (isNaN(idNum) || idNum <= 0) {
    const err = new Error('ID do chamado inválido.');
    err.status = 400;
    throw err;
  }

  const ticket = await ticketRepository.findById(idNum);
  if (!ticket) {
    const err = new Error('Chamado não encontrado.');
    err.status = 404;
    throw err;
  }

  let targetAssigned;
  if (assignedTo === 'me' || assignedTo === user.id) {
    targetAssigned = user.id;
  } else if (assignedTo === null || assignedTo === 'none') {
    targetAssigned = null;
  } else if (!isNaN(Number(assignedTo))) {
    targetAssigned = Number(assignedTo);
  } else {
    const err = new Error('Parâmetro assignedTo inválido. Deve ser "me", ID do usuário ou null.');
    err.status = 400;
    throw err;
  }

  // Transição de status em atendimento/aberto
  let newStatus = null;
  if (targetAssigned && ticket.Status === 'aberto') {
    newStatus = 'em_atendimento';
  } else if (!targetAssigned && ticket.Status === 'em_atendimento') {
    newStatus = 'aberto';
  }

  const updatedTicket = await ticketRepository.updateAssignment({
    ticketId: idNum,
    assignedTo: targetAssigned,
    newStatus
  });

  // Auditoria
  try {
    await auditLogRepository.log({
      userId: user.id,
      action: targetAssigned ? 'ticket_assigned' : 'ticket_unassigned',
      entityType: 'ticket',
      entityId: ticket.Id,
      detailsJson: {
        ticketId: ticket.Id,
        assignedTo: targetAssigned,
        previousAssignedTo: ticket.AssignedTo
      }
    });
  } catch (auditErr) {
    console.error('Falha ao registrar auditoria de atribuição do chamado:', auditErr.message);
  }

  return updatedTicket;
}

/**
 * Marca o chamado como resolvido (RH ou colaborador dono)
 */
async function resolveTicket(user, ticketId) {
  const idNum = parseInt(ticketId, 10);
  if (isNaN(idNum) || idNum <= 0) {
    const err = new Error('ID do chamado inválido.');
    err.status = 400;
    throw err;
  }

  if (user.role === 'gestor') {
    const err = new Error('Acesso negado: gestores não possuem acesso ao módulo de chamados.');
    err.status = 403;
    throw err;
  }

  const ticket = await ticketRepository.findById(idNum);
  if (!ticket) {
    const err = new Error('Chamado não encontrado.');
    err.status = 404;
    throw err;
  }

  // Colaborador só resolve o próprio chamado; chamado alheio -> 404
  if (user.role === 'colaborador' && ticket.RequesterUserId !== user.id) {
    const err = new Error('Chamado não encontrado.');
    err.status = 404;
    throw err;
  }

  if (user.role !== 'rh' && user.role !== 'colaborador') {
    const err = new Error('Acesso negado.');
    err.status = 403;
    throw err;
  }

  const updatedTicket = await ticketRepository.resolveTicket({
    ticketId: idNum,
    resolvedByUserId: user.id
  });

  // Notificação pós-commit: se o RH marcou como resolvido, notifica o colaborador
  if (user.role === 'rh') {
    try {
      await notificationRepository.upsertNotification({
        userId: ticket.RequesterUserId,
        type: 'chamado_resolvido',
        message: `Seu chamado #${ticket.Id} foi marcado como resolvido`,
        refType: 'chamado',
        refId: ticket.Id
      });
    } catch (notifErr) {
      console.error('Falha ao notificar colaborador sobre resolução do chamado:', notifErr.message);
    }
  }

  // Auditoria
  try {
    await auditLogRepository.log({
      userId: user.id,
      action: 'ticket_resolved',
      entityType: 'ticket',
      entityId: ticket.Id,
      detailsJson: {
        ticketId: ticket.Id,
        resolvedBy: user.id,
        resolvedByRole: user.role
      }
    });
  } catch (auditErr) {
    console.error('Falha ao registrar auditoria de resolução do chamado:', auditErr.message);
  }

  return updatedTicket;
}

module.exports = {
  createTicket,
  listMyTickets,
  listAllTickets,
  getTicketCounts,
  getTicketById,
  addMessage,
  assignTicket,
  resolveTicket
};
