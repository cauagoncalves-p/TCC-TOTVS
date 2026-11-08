// backend/src/routes/onboarding.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const onboardingController = require('../controllers/onboardingController');

// Configuração do multer em memória (máx 5 MB, apenas application/pdf)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      const err = new Error('Formato inválido. Apenas arquivos PDF são aceitos.');
      err.status = 400;
      return cb(err, false);
    }
    cb(null, true);
  }
});

// Middleware de tratamento de erro do multer (ex.: arquivo acima de 5 MB)
const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'O arquivo excede o limite máximo permitido de 5 MB.' });
      }
      return res.status(err.status || 400).json({ error: err.message });
    }
    next();
  });
};

// Todas as rotas de onboarding exigem autenticação e perfil 'rh'
router.use(authMiddleware);
router.use(requireRole('rh'));

// POST /api/onboarding/upload
router.post('/upload', handleUpload, onboardingController.upload);

// GET /api/onboarding?status=
router.get('/', onboardingController.list);

// GET /api/onboarding/:id
router.get('/:id', onboardingController.getById);

// PUT /api/onboarding/:id
router.put('/:id', onboardingController.update);

// POST /api/onboarding/:id/approve
router.post('/:id/approve', onboardingController.approve);

// POST /api/onboarding/:id/reject
router.post('/:id/reject', onboardingController.reject);

module.exports = router;
