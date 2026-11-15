// backend/src/controllers/knowledgeController.js
const knowledgeRepository = require('../repositories/knowledgeRepository');
const knowledgeIngestionService = require('../services/knowledgeIngestionService');
const knowledgePolicyService = require('../services/knowledgePolicyService');
const knowledgeRetrievalService = require('../services/knowledgeRetrievalService');
const auditLogRepository = require('../repositories/auditLogRepository');

/**
 * GET /api/knowledge/documents
 */
exports.listDocuments = async (req, res) => {
  try {
    const { type, status, q, archived, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const result = await knowledgeRepository.listDocuments({
      type,
      status,
      q,
      archived,
      limit: limitNum,
      offset
    });

    res.json({
      data: result.documents,
      pagination: {
        total: result.total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(result.total / limitNum) || 1
      }
    });
  } catch (err) {
    console.error('Erro ao listar documentos de conhecimento:', err);
    res.status(500).json({ error: 'Erro interno ao listar documentos.' });
  }
};

/**
 * GET /api/knowledge/documents/:id
 */
exports.getDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await knowledgeRepository.getDocumentById(id);
    if (!doc) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }
    res.json(doc);
  } catch (err) {
    console.error('Erro ao obter documento de conhecimento:', err);
    res.status(500).json({ error: 'Erro interno ao consultar documento.' });
  }
};

/**
 * GET /api/knowledge/documents/:id/chunks?page=&limit=
 */
exports.getDocumentChunks = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 30 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const offset = (pageNum - 1) * limitNum;

    const doc = await knowledgeRepository.getDocumentById(id);
    if (!doc) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }

    const result = await knowledgeRepository.getChunksByDocumentId(id, {
      limit: limitNum,
      offset
    });

    res.json({
      document: {
        id: doc.id,
        title: doc.title,
        version: doc.version,
        chunkCount: doc.chunkCount,
        indexStatus: doc.indexStatus
      },
      chunks: result.chunks,
      pagination: {
        total: result.total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(result.total / limitNum) || 1
      }
    });
  } catch (err) {
    console.error('Erro ao listar trechos do documento:', err);
    res.status(500).json({ error: 'Erro interno ao listar trechos.' });
  }
};

/**
 * POST /api/knowledge/documents (Upload de arquivo PDF)
 */
exports.uploadDocument = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo PDF foi enviado no campo "file".' });
    }

    const {
      title,
      docType = 'politica_interna',
      version,
      publishDate,
      effectiveFrom,
      effectiveTo,
      audience = 'rh',
      sourceOrg
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'O título do documento é obrigatório.' });
    }
    if (!version || !version.trim()) {
      return res.status(400).json({ error: 'A versão do documento é obrigatória.' });
    }

    const result = await knowledgeIngestionService.processAndIndexPdf({
      file,
      title: title.trim(),
      docType,
      version: version.trim(),
      publishDate: publishDate || null,
      effectiveFrom: effectiveFrom || null,
      effectiveTo: effectiveTo || null,
      audience,
      sourceOrg,
      userId: req.user.id
    });

    res.status(201).json({
      message: 'Documento enviado e indexado com sucesso.',
      document: result
    });
  } catch (err) {
    console.error('Erro no upload de documento:', err);
    const status = err.status || 500;
    res.status(status).json({
      error: err.message || 'Erro ao processar e indexar documento.'
    });
  }
};

/**
 * POST /api/knowledge/policies (Criar política em Markdown)
 */
exports.createPolicy = async (req, res) => {
  try {
    const {
      title,
      docType = 'politica_interna',
      version,
      publishDate,
      effectiveFrom,
      effectiveTo,
      audience = 'rh',
      bodyText
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'O título da política é obrigatório.' });
    }
    if (!version || !version.trim()) {
      return res.status(400).json({ error: 'A versão da política é obrigatória.' });
    }
    if (!bodyText || !bodyText.trim()) {
      return res.status(400).json({ error: 'O conteúdo em Markdown é obrigatório.' });
    }

    const result = await knowledgePolicyService.createPolicy({
      title: title.trim(),
      docType,
      version: version.trim(),
      publishDate: publishDate || null,
      effectiveFrom: effectiveFrom || null,
      effectiveTo: effectiveTo || null,
      audience,
      bodyText,
      userId: req.user.id
    });

    res.status(201).json({
      message: 'Política criada e indexada com sucesso.',
      policy: result
    });
  } catch (err) {
    console.error('Erro ao criar política:', err);
    const status = err.status || 500;
    res.status(status).json({
      error: err.message || 'Erro ao criar política.'
    });
  }
};

/**
 * PUT /api/knowledge/policies/:id (Editar gerando nova versão)
 */
exports.updatePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      docType = 'politica_interna',
      version,
      publishDate,
      effectiveFrom,
      effectiveTo,
      audience = 'rh',
      bodyText
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'O título da política é obrigatório.' });
    }
    if (!version || !version.trim()) {
      return res.status(400).json({ error: 'A versão da política é obrigatória.' });
    }
    if (!bodyText || !bodyText.trim()) {
      return res.status(400).json({ error: 'O conteúdo em Markdown é obrigatório.' });
    }

    const result = await knowledgePolicyService.updatePolicy(id, {
      title: title.trim(),
      docType,
      version: version.trim(),
      publishDate: publishDate || null,
      effectiveFrom: effectiveFrom || null,
      effectiveTo: effectiveTo || null,
      audience,
      bodyText,
      userId: req.user.id
    });

    res.json({
      message: 'Nova versão da política criada e indexada com sucesso.',
      policy: result
    });
  } catch (err) {
    console.error('Erro ao atualizar política:', err);
    const status = err.status || 500;
    res.status(status).json({
      error: err.message || 'Erro ao atualizar política.'
    });
  }
};

/**
 * POST /api/knowledge/policies/structure-preview
 */
exports.structurePreview = async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: 'O texto base (rawText) é obrigatório.' });
    }

    const result = await knowledgePolicyService.structurePreview(rawText);
    res.json(result);
  } catch (err) {
    console.error('Erro ao sugerir estrutura de política:', err);
    res.status(500).json({ error: err.message || 'Erro ao sugerir estrutura.' });
  }
};

/**
 * PATCH /api/knowledge/documents/:id
 */
exports.patchDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { audience, effectiveFrom, effectiveTo, isCurrent, isArchived, title, version } = req.body;

    const existing = await knowledgeRepository.getDocumentById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }

    await knowledgeRepository.updateDocument(id, {
      audience,
      effectiveFrom,
      effectiveTo,
      isCurrent,
      isArchived,
      title,
      version
    });

    knowledgeRetrievalService.invalidateCache();

    await auditLogRepository.log({
      userId: req.user.id,
      action: isArchived ? 'knowledge_document_archived' : 'knowledge_document_patched',
      entityType: 'knowledge_document',
      entityId: String(id),
      detailsJson: {
        previous: {
          audience: existing.audience,
          isCurrent: existing.isCurrent,
          isArchived: existing.isArchived
        },
        updated: {
          audience,
          isCurrent,
          isArchived
        }
      }
    });

    const updated = await knowledgeRepository.getDocumentById(id);
    res.json({
      message: 'Documento atualizado com sucesso.',
      document: updated
    });
  } catch (err) {
    console.error('Erro ao atualizar documento:', err);
    res.status(500).json({ error: 'Erro ao atualizar documento.' });
  }
};

/**
 * POST /api/knowledge/documents/:id/reindex
 */
exports.reindexDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await knowledgeIngestionService.reindexPolicy(id, req.user.id);
    res.json({
      message: 'Documento reindexado com sucesso.',
      result
    });
  } catch (err) {
    console.error('Erro ao reindexar documento:', err);
    const status = err.status || 500;
    res.status(status).json({
      error: err.message || 'Erro ao reindexar documento.'
    });
  }
};

/**
 * POST /api/knowledge/test-question
 */
exports.testQuestion = async (req, res) => {
  try {
    const { question, audienceScope = 'rh' } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'A pergunta (question) é obrigatória.' });
    }

    const result = await knowledgeRetrievalService.answerQuestion({
      question: question.trim(),
      audienceScope
    });

    res.json(result);
  } catch (err) {
    console.error('Erro ao testar pergunta na base de conhecimento:', err);
    res.status(500).json({ error: err.message || 'Erro ao processar pergunta.' });
  }
};

/**
 * POST /api/compliance/assistant/chat (Assistente Trabalhista KAb)
 */
exports.assistantChat = async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'A mensagem é obrigatória.' });
    }

    // Assistente trabalhista (RH/Gestor) possui escopo 'rh'
    const result = await knowledgeRetrievalService.answerQuestion({
      question: message.trim(),
      audienceScope: req.user.role || 'rh',
      history
    });

    res.json({
      reply: result.reply,
      sources: result.sources,
      nao_confirmada: result.unconfirmed,
      chunks: result.chunks
    });
  } catch (err) {
    console.error('Erro no chat do assistente trabalhista:', err);
    res.status(500).json({ error: 'Erro ao responder consulta trabalhista.' });
  }
};
