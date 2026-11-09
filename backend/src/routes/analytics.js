// backend/src/routes/analytics.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const analyticsController = require('../controllers/analyticsController');

// Todas as rotas de analytics exigem autenticação e perfil 'gestor' ou 'rh'
router.use(authMiddleware);
router.use(requireRole(['gestor', 'rh']));

// GET /api/analytics/departments
router.get('/departments', analyticsController.getDepartments);

// GET /api/analytics/summary?from=&to=&departmentId=
router.get('/summary', analyticsController.getSummary);

// GET /api/analytics/timeseries?from=&to=&departmentId=
router.get('/timeseries', analyticsController.getTimeseries);

// GET /api/analytics/by-department?month=
router.get('/by-department', analyticsController.getByDepartment);

// GET /api/analytics/hotspots
router.get('/hotspots', analyticsController.getHotspots);

module.exports = router;
