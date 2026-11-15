// backend/src/routes/adminUsers.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const adminUserController = require('../controllers/adminUserController');

// Todas as rotas administrativas exigem autenticação e perfil 'rh'
router.use(authMiddleware);
router.use(requireRole('rh'));

// GET /api/admin/users
router.get('/', adminUserController.listUsers);

// POST /api/admin/users
router.post('/', adminUserController.createUser);

// PATCH /api/admin/users/:id
router.patch('/:id', adminUserController.updateUser);

// POST /api/admin/users/:id/reset-password
router.post('/:id/reset-password', adminUserController.resetPassword);

module.exports = router;
