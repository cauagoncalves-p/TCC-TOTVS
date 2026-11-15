// backend/src/repositories/knowledgeRepository.js
const { sql, poolPromise } = require('../config/db');

/**
 * Normaliza os campos do documento a partir do recordset
 */
function normalizeDoc(row) {
  if (!row) return null;
  return {
    id: row.Id,
    title: row.Title,
    docType: row.DocType,
    sourceOrg: row.SourceOrg,
    sourceUrl: row.SourceUrl,
    version: row.Version,
    publishedAt: row.PublishedAt,
    effectiveFrom: row.EffectiveFrom,
    effectiveTo: row.EffectiveTo,
    isCurrent: Boolean(row.IsCurrent),
    fileName: row.FileName,
    uploadedBy: row.UploadedBy,
    uploadedAt: row.UploadedAt,
    audience: row.Audience || 'rh',
    sourceKind: row.SourceKind || 'arquivo',
    bodyText: row.BodyText || null,
    indexStatus: row.IndexStatus || 'indexado',
    indexError: row.IndexError || null,
    chunkCount: row.ChunkCount || 0,
    extractionMethod: row.ExtractionMethod || null,
    sizeBytes: row.SizeBytes ? Number(row.SizeBytes) : null,
    isArchived: Boolean(row.IsArchived),
    updatedAt: row.UpdatedAt,
    previousVersionId: row.PreviousVersionId || null
  };
}

/**
 * Lista documentos com filtros e paginação
 */
async function listDocuments({ type, status, q, archived, limit = 50, offset = 0 } = {}) {
  const pool = await poolPromise;
  const req = pool.request()
    .input('limit', limit)
    .input('offset', offset);

  const where = ['1=1'];

  if (type) {
    req.input('type', type);
    where.push('d.DocType = @type');
  }

  if (status) {
    req.input('status', status);
    where.push('d.IndexStatus = @status');
  }

  if (archived !== undefined && archived !== null && archived !== '') {
    const isArch = (archived === true || archived === 'true' || archived === 1 || archived === '1') ? 1 : 0;
    req.input('archived', isArch);
    where.push('d.IsArchived = @archived');
  } else {
    // Por padrão esconde arquivados a menos que solicitado
    where.push('d.IsArchived = 0');
  }

  if (q && q.trim()) {
    req.input('searchTerm', `%${q.trim()}%`);
    where.push('(d.Title LIKE @searchTerm OR d.FileName LIKE @searchTerm OR d.Version LIKE @searchTerm)');
  }

  const whereStr = where.join(' AND ');

  const countRes = await req.query(`
    SELECT COUNT(*) AS total
    FROM dbo.KnowledgeDocuments d
    WHERE ${whereStr}
  `);
  const total = countRes.recordset[0]?.total || 0;

  const listRes = await req.query(`
    SELECT 
      d.Id, d.Title, d.DocType, d.SourceOrg, d.SourceUrl, d.Version,
      d.PublishedAt, d.EffectiveFrom, d.EffectiveTo, d.IsCurrent,
      d.FileName, d.UploadedBy, d.UploadedAt, d.Audience, d.SourceKind,
      d.IndexStatus, d.IndexError, d.ChunkCount, d.ExtractionMethod,
      d.SizeBytes, d.IsArchived, d.UpdatedAt, d.PreviousVersionId
    FROM dbo.KnowledgeDocuments d
    WHERE ${whereStr}
    ORDER BY d.IsCurrent DESC, d.UploadedAt DESC, d.Id DESC
    OFFSET @offset ROWS
    FETCH NEXT @limit ROWS ONLY
  `);

  return {
    documents: listRes.recordset.map(normalizeDoc),
    total
  };
}

/**
 * Busca documento por ID
 */
async function getDocumentById(id) {
  const pool = await poolPromise;
  const res = await pool.request()
    .input('id', id)
    .query(`
      SELECT 
        d.Id, d.Title, d.DocType, d.SourceOrg, d.SourceUrl, d.Version,
        d.PublishedAt, d.EffectiveFrom, d.EffectiveTo, d.IsCurrent,
        d.FileName, d.UploadedBy, d.UploadedAt, d.Audience, d.SourceKind,
        d.BodyText, d.IndexStatus, d.IndexError, d.ChunkCount, d.ExtractionMethod,
        d.SizeBytes, d.IsArchived, d.UpdatedAt, d.PreviousVersionId
      FROM dbo.KnowledgeDocuments d
      WHERE d.Id = @id
    `);
  return normalizeDoc(res.recordset[0]);
}

/**
 * Busca documento vigente com mesmo título
 */
async function findCurrentByTitle(title) {
  const pool = await poolPromise;
  const res = await pool.request()
    .input('title', title.trim())
    .query(`
      SELECT TOP 1 
        d.Id, d.Title, d.Version, d.Audience, d.DocType, d.IsCurrent
      FROM dbo.KnowledgeDocuments d
      WHERE LOWER(d.Title) = LOWER(@title) AND d.IsCurrent = 1 AND d.IsArchived = 0
      ORDER BY d.Id DESC
    `);
  return res.recordset[0] || null;
}

/**
 * Busca trechos (chunks) de um documento com paginação
 */
async function getChunksByDocumentId(documentId, { limit = 50, offset = 0 } = {}) {
  const pool = await poolPromise;
  const req = pool.request()
    .input('docId', documentId)
    .input('limit', limit)
    .input('offset', offset);

  const countRes = await req.query(`
    SELECT COUNT(*) AS total
    FROM dbo.KnowledgeChunks
    WHERE DocumentId = @docId
  `);
  const total = countRes.recordset[0]?.total || 0;

  const listRes = await req.query(`
    SELECT 
      Id, DocumentId, ChunkIndex, Page, SectionRef, Content
    FROM dbo.KnowledgeChunks
    WHERE DocumentId = @docId
    ORDER BY ChunkIndex ASC
    OFFSET @offset ROWS
    FETCH NEXT @limit ROWS ONLY
  `);

  const chunks = listRes.recordset.map(row => ({
    id: row.Id,
    documentId: row.DocumentId,
    chunkIndex: row.ChunkIndex,
    page: row.Page,
    sectionRef: row.SectionRef,
    content: row.Content
  }));

  return { chunks, total };
}

/**
 * Cria documento e seus chunks em uma transação ACID.
 * Se houver previousVersionId, desativa a versão anterior.
 */
async function createDocumentWithChunks(docData, chunks = [], previousVersionId = null) {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    // 1. Se tem versão anterior, desmarca IsCurrent e marca EffectiveTo
    if (previousVersionId) {
      const prevReq = new sql.Request(transaction);
      await prevReq
        .input('prevId', previousVersionId)
        .query(`
          UPDATE dbo.KnowledgeDocuments
          SET IsCurrent = 0,
              EffectiveTo = CAST(SYSUTCDATETIME() AS DATE),
              UpdatedAt = SYSUTCDATETIME()
          WHERE Id = @prevId
        `);
    }

    // 2. Insere o novo documento
    const insertReq = new sql.Request(transaction);
    insertReq
      .input('title', docData.title)
      .input('docType', docData.docType)
      .input('sourceOrg', docData.sourceOrg || 'Interno')
      .input('sourceUrl', docData.sourceUrl || null)
      .input('version', docData.version)
      .input('publishedAt', docData.publishedAt || null)
      .input('effectiveFrom', docData.effectiveFrom || null)
      .input('effectiveTo', docData.effectiveTo || null)
      .input('isCurrent', docData.isCurrent !== undefined ? (docData.isCurrent ? 1 : 0) : 1)
      .input('fileName', docData.fileName || null)
      .input('uploadedBy', docData.uploadedBy)
      .input('audience', docData.audience || 'rh')
      .input('sourceKind', docData.sourceKind || 'arquivo')
      .input('bodyText', docData.bodyText || null)
      .input('indexStatus', docData.indexStatus || 'indexado')
      .input('indexError', docData.indexError || null)
      .input('chunkCount', chunks.length)
      .input('extractionMethod', docData.extractionMethod || 'texto')
      .input('sizeBytes', docData.sizeBytes || null)
      .input('previousVersionId', previousVersionId || null);

    const docRes = await insertReq.query(`
      INSERT INTO dbo.KnowledgeDocuments (
        Title, DocType, SourceOrg, SourceUrl, Version,
        PublishedAt, EffectiveFrom, EffectiveTo, IsCurrent,
        FileName, UploadedBy, Audience, SourceKind, BodyText,
        IndexStatus, IndexError, ChunkCount, ExtractionMethod,
        SizeBytes, PreviousVersionId, UploadedAt
      )
      OUTPUT INSERTED.Id
      VALUES (
        @title, @docType, @sourceOrg, @sourceUrl, @version,
        @publishedAt, @effectiveFrom, @effectiveTo, @isCurrent,
        @fileName, @uploadedBy, @audience, @sourceKind, @bodyText,
        @indexStatus, @indexError, @chunkCount, @extractionMethod,
        @sizeBytes, @previousVersionId, SYSUTCDATETIME()
      )
    `);

    const newDocId = docRes.recordset[0].Id;

    // 3. Insere os trechos (chunks) em lotes
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const chunkReq = new sql.Request(transaction);
      chunkReq
        .input('docId', newDocId)
        .input('chunkIndex', i)
        .input('page', c.page || null)
        .input('sectionRef', c.sectionRef || null)
        .input('content', c.content);

      await chunkReq.query(`
        INSERT INTO dbo.KnowledgeChunks (DocumentId, ChunkIndex, Page, SectionRef, Content)
        VALUES (@docId, @chunkIndex, @page, @sectionRef, @content)
      `);
    }

    await transaction.commit();
    return newDocId;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

/**
 * Atualiza campos parciais do documento (PATCH)
 */
async function updateDocument(id, fields) {
  const pool = await poolPromise;
  const req = pool.request().input('id', id);

  const updates = [];

  if (fields.audience !== undefined) {
    req.input('audience', fields.audience);
    updates.push('Audience = @audience');
  }

  if (fields.effectiveFrom !== undefined) {
    req.input('effectiveFrom', fields.effectiveFrom);
    updates.push('EffectiveFrom = @effectiveFrom');
  }

  if (fields.effectiveTo !== undefined) {
    req.input('effectiveTo', fields.effectiveTo);
    updates.push('EffectiveTo = @effectiveTo');
  }

  if (fields.isCurrent !== undefined) {
    req.input('isCurrent', fields.isCurrent ? 1 : 0);
    updates.push('IsCurrent = @isCurrent');
  }

  if (fields.isArchived !== undefined) {
    req.input('isArchived', fields.isArchived ? 1 : 0);
    updates.push('IsArchived = @isArchived');
  }

  if (fields.title !== undefined) {
    req.input('title', fields.title);
    updates.push('Title = @title');
  }

  if (fields.version !== undefined) {
    req.input('version', fields.version);
    updates.push('Version = @version');
  }

  if (updates.length === 0) return;

  updates.push('UpdatedAt = SYSUTCDATETIME()');

  await req.query(`
    UPDATE dbo.KnowledgeDocuments
    SET ${updates.join(', ')}
    WHERE Id = @id
  `);
}

/**
 * Substitui os chunks de um documento (usado na reindexação)
 */
async function replaceChunks(documentId, chunks, extractionMethod = 'texto') {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const delReq = new sql.Request(transaction);
    await delReq.input('docId', documentId).query('DELETE FROM dbo.KnowledgeChunks WHERE DocumentId = @docId');

    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const chunkReq = new sql.Request(transaction);
      chunkReq
        .input('docId', documentId)
        .input('chunkIndex', i)
        .input('page', c.page || null)
        .input('sectionRef', c.sectionRef || null)
        .input('content', c.content);

      await chunkReq.query(`
        INSERT INTO dbo.KnowledgeChunks (DocumentId, ChunkIndex, Page, SectionRef, Content)
        VALUES (@docId, @chunkIndex, @page, @sectionRef, @content)
      `);
    }

    const updReq = new sql.Request(transaction);
    updReq
      .input('docId', documentId)
      .input('count', chunks.length)
      .input('method', extractionMethod);

    await updReq.query(`
      UPDATE dbo.KnowledgeDocuments
      SET ChunkCount = @count,
          IndexStatus = 'indexado',
          IndexError = NULL,
          ExtractionMethod = @method,
          UpdatedAt = SYSUTCDATETIME()
      WHERE Id = @docId
    `);

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

/**
 * Retorna todos os trechos de documentos vigentes para o escopo de público informado
 * @param {string[]} audienceList lista de públicos permitidos, ex: ['colaboradores', 'todos']
 */
async function getAllActiveChunks(audienceList = ['todos']) {
  const pool = await poolPromise;
  const req = pool.request();

  const audiencePlaceholders = audienceList.map((aud, idx) => {
    const key = `aud_${idx}`;
    req.input(key, aud);
    return `@${key}`;
  }).join(', ');

  const res = await req.query(`
    SELECT 
      c.Id AS ChunkId,
      c.DocumentId,
      c.ChunkIndex,
      c.Page,
      c.SectionRef,
      c.Content,
      d.Title,
      d.DocType,
      d.Version,
      d.PublishedAt,
      d.Audience,
      d.SourceOrg,
      d.SourceKind
    FROM dbo.KnowledgeChunks c
    JOIN dbo.KnowledgeDocuments d ON d.Id = c.DocumentId
    WHERE d.IsCurrent = 1
      AND d.IsArchived = 0
      AND d.IndexStatus = 'indexado'
      AND (d.EffectiveFrom IS NULL OR d.EffectiveFrom <= CAST(SYSUTCDATETIME() AS DATE))
      AND (d.EffectiveTo IS NULL OR d.EffectiveTo >= CAST(SYSUTCDATETIME() AS DATE))
      AND d.Audience IN (${audiencePlaceholders})
    ORDER BY d.Id ASC, c.ChunkIndex ASC
  `);

  return res.recordset.map(row => ({
    chunkId: row.ChunkId,
    documentId: row.DocumentId,
    chunkIndex: row.ChunkIndex,
    page: row.Page,
    sectionRef: row.SectionRef,
    content: row.Content,
    title: row.Title,
    docType: row.DocType,
    version: row.Version,
    publishedAt: row.PublishedAt,
    audience: row.Audience,
    sourceOrg: row.SourceOrg,
    sourceKind: row.SourceKind
  }));
}

module.exports = {
  listDocuments,
  getDocumentById,
  findCurrentByTitle,
  getChunksByDocumentId,
  createDocumentWithChunks,
  updateDocument,
  replaceChunks,
  getAllActiveChunks
};
