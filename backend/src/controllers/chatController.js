// backend/src/controllers/chatController.js
const chatService = require('../services/chatService');

exports.postMessage = async (req, res) => {
  const { sessionId, message } = req.body;
  const userId = req.user.id;

  // Validação: texto, não vazio, máx 1000 caracteres
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'A mensagem não pode ser vazia.' });
  }

  if (message.length > 1000) {
    return res.status(400).json({ error: 'A mensagem excede o limite máximo de 1000 caracteres.' });
  }

  try {
    const result = await chatService.handleMessage({
      userId,
      sessionId,
      message: message.trim()
    });
    return res.json(result);
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ error: err.message });
    }
    console.error('Erro ao processar mensagem no chat:', err.message);
    // Retorno 502 amigável sem expor chave nem stack trace
    return res.status(502).json({
      error: 'Não foi possível processar sua mensagem no momento. Por favor, tente novamente mais tarde.'
    });
  }
};

exports.getMessages = async (req, res) => {
  const sessionId = req.params.id;
  const userId = req.user.id;

  try {
    const messages = await chatService.getSessionMessages({ userId, sessionId });
    if (!messages) {
      return res.status(404).json({ error: 'Sessão não encontrada ou não pertence ao usuário.' });
    }
    return res.json({ sessionId, messages });
  } catch (err) {
    console.error('Erro ao recuperar mensagens da sessão:', err.message);
    return res.status(500).json({ error: 'Erro interno ao consultar mensagens da sessão.' });
  }
};
