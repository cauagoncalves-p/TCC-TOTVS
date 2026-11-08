// backend/src/routes/chat.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const chatController = require('../controllers/chatController');

// POST /api/chat (cria ou continua uma sessão)
router.post('/chat', authMiddleware, chatController.postMessage);

// GET /api/chat/sessions/:id/messages (histórico protegido)
router.get('/chat/sessions/:id/messages', authMiddleware, chatController.getMessages);

module.exports = router;
