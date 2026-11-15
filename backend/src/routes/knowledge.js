// backend/src/routes/knowledge.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/roleMiddleware');
const knowledgeController = require('../controllers/knowledgeController');

// Multer em memória com limite de 20 MB para PDFs
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 MB
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

// Middleware para captura de erros do Multer (ex: LIMIT_FILE_SIZE)
const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'O arquivo excede o limite máximo permitido de 20 MB.' });
      }
      return res.status(err.status || 400).json({ error: err.message || 'Erro no envio do arquivo.' });
    }
    next();
  });
};

// Todas as rotas de conhecimento exigem autenticação
router.use(authMiddleware);

// Rotas de leitura (permitidas para RH e Gestor)
router.get('/documents', requireRole(['rh', 'gestor']), knowledgeController.listDocuments);
router.get('/documents/:id', requireRole(['rh', 'gestor']), knowledgeController.getDocument);
router.get('/documents/:id/chunks', requireRole(['rh', 'gestor']), knowledgeController.getDocumentChunks);
router.post('/test-question', requireRole(['rh', 'gestor']), knowledgeController.testQuestion);

// Rotas administrativas / gestão (restritas a RH)
router.post('/documents', requireRole('rh'), handleUpload, knowledgeController.uploadDocument);
router.post('/policies', requireRole('rh'), knowledgeController.createPolicy);
router.put('/policies/:id', requireRole('rh'), knowledgeController.updatePolicy);
router.post('/policies/structure-preview', requireRole('rh'), knowledgeController.structurePreview);
router.patch('/documents/:id', requireRole('rh'), knowledgeController.patchDocument);
router.post('/documents/:id/reindex', requireRole('rh'), knowledgeController.reindexDocument);

module.exports = router;
