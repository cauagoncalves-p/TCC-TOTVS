// backend/src/routes/compliance.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const complianceController = require('../controllers/complianceController');

// Todas as rotas de compliance exigem autenticação
router.use(authMiddleware);

// Rotas de leitura: permitidas para 'rh' e 'gestor'
router.get('/rules', requireRole(['rh', 'gestor']), complianceController.listRules);
router.get('/runs', requireRole(['rh', 'gestor']), complianceController.listRuns);
router.get('/issues', requireRole(['rh', 'gestor']), complianceController.listIssues);
router.get('/esocial/events', requireRole(['rh', 'gestor']), complianceController.listEsocialEvents);
router.get('/audit-log', requireRole(['rh', 'gestor']), complianceController.listAuditLog);

// Rotas de alteração / execução: restritas estritamente para 'rh' (gestor recebe 403)
router.post('/runs', requireRole('rh'), complianceController.executeRun);
router.patch('/issues/:id', requireRole('rh'), complianceController.updateIssueStatus);
router.post('/esocial/events/:id/confirm', requireRole('rh'), complianceController.confirmEsocialEvent);

module.exports = router;
