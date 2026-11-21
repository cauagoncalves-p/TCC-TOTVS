// backend/src/routes/retention.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const retentionController = require('../controllers/retentionController');

// Todas as rotas de acompanhamento individual são RESTRITAS EXCLUSIVAMENTE ao perfil 'rh'
// Perfis 'gestor' e 'colaborador' recebem 403 Forbidden automaticamente.
router.use(authMiddleware);
router.use(requireRole(['rh']));

// Lista paginada de colaboradores e seus índices
router.get('/employees', retentionController.getEmployees);

// Detalhes completos de um colaborador específico (com registro de auditoria)
router.get('/employees/:id', retentionController.getEmployeeById);

// Registro de ações de acompanhamento (apoio, sem dados de saúde)
router.post('/employees/:id/follow-ups', retentionController.addFollowUp);

// Recálculo do índice de atenção
router.post('/recalculate', retentionController.recalculate);

// Contagem resumida por nível de atenção
router.get('/summary', retentionController.getSummary);

// Parâmetros, limites e regras do cálculo (transparência e explicabilidade)
router.get('/config', retentionController.getConfig);

// Comparação com o gabarito SeedExpectedAttention
router.get('/gabarito-check', retentionController.getGabaritoComparison);

module.exports = router;
