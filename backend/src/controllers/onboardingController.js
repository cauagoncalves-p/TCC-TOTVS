// backend/src/controllers/onboardingController.js
const onboardingService = require('../services/onboardingService');
const documentTypes = require('../ai/documentTypes');

/**
 * Criação manual de caso de onboarding sem documento PDF
 */
exports.createManual = async (req, res) => {
  try {
    const payload = req.body || {};
    const cadastro = payload.cadastro || (payload.fullName !== undefined ? payload : {});
    const perfil = payload.perfil || null;

    const result = await onboardingService.createManualCase({
      cadastro,
      perfil,
      userId: req.user.id
    });
    return res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {})
    });
  }
};

/**
 * Validação de dados cadastrais sem gravar nada no banco
 */
exports.validate = async (req, res) => {
  try {
    const payload = req.body || {};
    const cadastro = payload.cadastro || (payload.fullName !== undefined ? payload : {});

    const result = await onboardingService.validateManualCandidateData({ cadastro });
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {})
    });
  }
};

exports.upload = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado. Envie um arquivo PDF no campo multipart "file".' });
  }

  try {
    const result = await onboardingService.processUpload({
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname,
      userId: req.user.id,
      documentType: req.body.documentType
    });
    return res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {})
    });
  }
};

exports.addDocument = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado. Envie um arquivo PDF no campo multipart "file".' });
  }

  const caseId = parseInt(req.params.id, 10);
  if (isNaN(caseId)) {
    return res.status(400).json({ error: 'ID do caso inválido.' });
  }

  try {
    const result = await onboardingService.addDocumentToCase({
      caseId,
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname,
      userId: req.user.id,
      documentType: req.body.documentType
    });
    return res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {})
    });
  }
};

exports.removeDocument = async (req, res) => {
  const caseId = parseInt(req.params.id, 10);
  const docId = parseInt(req.params.docId, 10);

  if (isNaN(caseId) || isNaN(docId)) {
    return res.status(400).json({ error: 'IDs de caso ou documento inválidos.' });
  }

  try {
    const result = await onboardingService.removeDocumentFromCase({
      caseId,
      docId,
      userId: req.user.id
    });
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};

exports.listDocumentTypes = async (req, res) => {
  try {
    const types = documentTypes.listTypes();
    return res.json({ types });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar tipos de documentos.' });
  }
};

exports.list = async (req, res) => {
  try {
    const { status } = req.query;
    const cases = await onboardingService.listCases(status);
    return res.json({ cases });
  } catch (err) {
    console.error('Erro ao listar casos de onboarding:', err);
    return res.status(500).json({ error: 'Erro interno ao listar casos de onboarding.' });
  }
};

exports.getById = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const caseObj = await onboardingService.getCaseById(id);
    return res.json(caseObj);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const result = await onboardingService.updateReview(id, req.body);
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};

exports.approve = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const result = await onboardingService.approveCase(id, req.user.id);
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {})
    });
  }
};

exports.reject = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { reason } = req.body;
  try {
    const result = await onboardingService.rejectCase(id, req.user.id, reason);
    return res.json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};
