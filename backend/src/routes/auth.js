// backend/src/routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/change-password
router.post('/change-password', authMiddleware, authController.changePassword);

module.exports = router;
