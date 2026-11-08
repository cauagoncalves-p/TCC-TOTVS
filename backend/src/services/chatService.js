// backend/src/services/chatService.js
const chatRepository = require('../repositories/chatRepository');
const geminiClient = require('../ai/geminiClient');
const employeeService = require('./employeeService');
const vacationService = require('./vacationService');
const payslipService = require('./payslipService');

/**
 * Processa a mensagem do colaborador, invocando o Gemini e ferramentas quando necessário.
 * @param {Object} params { userId, sessionId, message }
 * @returns {Promise<{sessionId: string, reply: string}>}
 */
async function handleMessage({ userId, sessionId, message }) {
  let sessId = sessionId;

  if (!sessId) {
    sessId = await chatRepository.createSession(userId);
  } else {
    const isOwned = await chatRepository.isOwner(sessId, userId);
    if (!isOwned) {
      const error = new Error('Sessão não encontrada ou não pertence ao usuário');
      error.status = 404;
      throw error;
    }
  }

  // Recupera histórico recente antes de registrar a mensagem atual
  const history = await chatRepository.getLastMessages(sessId, 10);

  // Persiste a mensagem do usuário
  await chatRepository.saveMessage({
    sessionId: sessId,
    role: 'user',
    content: message,
    toolUsed: null
  });

  // Handlers com injeção segura de req.user.id
  const toolHandlers = {
    getMyProfile: async () => {
      const profile = await employeeService.getProfile(userId);
      return profile || { error: 'Perfil não encontrado' };
    },
    getVacationBalance: async () => {
      const balance = await vacationService.getVacationBalance(userId);
      return balance || { error: 'Saldo de férias não localizado' };
    },
    getPayslip: async ({ competence }) => {
      return await payslipService.getPayslip(userId, competence);
    },
    getPayslipItems: async ({ competence }) => {
      return await payslipService.getPayslipItems(userId, competence);
    }
  };

  // Chama o Gemini com loop de function calling
  const { reply, toolUsed } = await geminiClient.generateReply(history, message, toolHandlers, 3);

  // Persiste a resposta do modelo e registra as ferramentas acionadas
  await chatRepository.saveMessage({
    sessionId: sessId,
    role: 'model',
    content: reply,
    toolUsed
  });

  return { sessionId: sessId, reply };
}

/**
 * Retorna as mensagens de uma sessão pertencente ao usuário autenticado
 * @param {Object} params { userId, sessionId }
 * @returns {Promise<Array|null>}
 */
async function getSessionMessages({ userId, sessionId }) {
  const isOwned = await chatRepository.isOwner(sessionId, userId);
  if (!isOwned) {
    return null;
  }
  return await chatRepository.getLastMessages(sessionId, 50);
}

module.exports = { handleMessage, getSessionMessages };
