// backend/src/routes/alerts.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const alertController = require('../controllers/alertController');

// Todas as rotas de alertas exigem autenticação e perfil 'gestor' ou 'rh'
router.use(authMiddleware);
router.use(requireRole(['gestor', 'rh']));

// POST /api/alerts/generate - Recalcula os alertas pelas regras
router.post('/generate', alertController.generate);

// GET /api/alerts?status=&risk=&departmentId= - Lista alertas
router.get('/', alertController.list);

// PATCH /api/alerts/:id - Muda status ('lido', 'resolvido')
router.patch('/:id', alertController.updateStatus);

module.exports = router;
