// backend/src/routes/me.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const meController = require('../controllers/meController');

// GET /api/me
router.get('/me', authMiddleware, meController.getProfile);

module.exports = router;
