// backend/src/services/knowledgeIngestionService.js
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const knowledgeRepository = require('../repositories/knowledgeRepository');
const auditLogRepository = require('../repositories/auditLogRepository');
const knowledgeRetrievalService = require('./knowledgeRetrievalService');

const MAX_KB_PAGES = parseInt(process.env.MAX_KB_PAGES, 10) || 300;

/**
 * Valida a assinatura de arquivo PDF (%PDF) e limite de páginas
 * @param {Buffer} buffer
 */
function validatePdfBuffer(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Arquivo inválido ou corrompido.');
  }

  if (buffer.length < 4) {
    throw new Error('Arquivo muito pequeno para ser um PDF válido.');
  }

  const magicHeader = buffer.slice(0, 4).toString('ascii');
  if (magicHeader !== '%PDF') {
    throw new Error('Assinatura do arquivo inválida. O arquivo enviado não é um PDF legítimo (%PDF).');
  }
}

/**
 * Detecta presença de dados pessoais (CPF, e-mail, telefone)
 * @param {string} text
 * @returns {{ hasPii: boolean, warnings: string[] }}
 */
function detectPii(text) {
  if (!text) return { hasPii: false, warnings: [] };

  const warnings = [];
  const cpfRegex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const phoneRegex = /\b(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-\s]?\d{4}\b/g;

  if (cpfRegex.test(text)) {
    warnings.push('Padrão compatível com CPF detectado no conteúdo.');
  }
  if (emailRegex.test(text)) {
    warnings.push('Padrão compatível com endereço de e-mail detectado no conteúdo.');
  }
  if (phoneRegex.test(text)) {
    warnings.push('Padrão compatível com telefone/celular detectado no conteúdo.');
  }

  return {
    hasPii: warnings.length > 0,
    warnings
  };
}

/**
 * Extrai texto do PDF página por página via pdf-parse
 * @param {Buffer} buffer
 */
async function extractPagesWithPdfParse(buffer) {
  const pages = [];

  const options = {
    pagerender: async function (pageData) {
      const textContent = await pageData.getTextContent();
      let lastY = null;
      let pageText = '';

      for (const item of textContent.items) {
        if (!item.str) continue;
        if (lastY === null || Math.abs(lastY - item.transform[5]) < 2) {
          pageText += item.str + ' ';
        } else {
          pageText += '\n' + item.str + ' ';
        }
        lastY = item.transform[5];
      }

      const cleanText = pageText.trim();
      pages.push({
        pageNumber: pageData.pageIndex + 1,
        text: cleanText
      });

      return cleanText;
    }
  };

  const data = await pdfParse(buffer, options);

  if (data.numpages > MAX_KB_PAGES) {
    const err = new Error(`O PDF excede o limite máximo permitido de ${MAX_KB_PAGES} páginas (arquivo tem ${data.numpages} páginas).`);
    err.status = 422;
    throw err;
  }

  let totalChars = 0;
  pages.forEach(p => {
    totalChars += (p.text || '').replace(/\s+/g, '').length;
  });

  return {
    pageCount: data.numpages,
    pages,
    totalUsefulChars: totalChars
  };
}

/**
 * Plano B para PDF escaneado (OCR com Gemini)
 * @param {Buffer} buffer
 */
async function ocrFallbackWithGemini(buffer) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Não foi possível ler o texto deste PDF (camada de texto ausente e GEMINI_API_KEY não configurada).');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `Você é um sistema de extração OCR de alta precisão para documentos de RH e conformidade trabalhista.
Transcreva fielmente o texto integral deste documento PDF em português, sem resumir, sem omitir regras, números, prazos ou artigos e sem adicionar opiniões.
Separe cada página identificando explicitamente no topo: "--- PÁGINA X ---" (onde X é o número da página).
Preserve títulos, cabeçalhos, seções e pares de perguntas e respostas.`;

  const result = await model.generateContent([
    {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: 'application/pdf'
      }
    },
    prompt
  ]);

  const rawText = result.response.text();
  if (!rawText || rawText.trim().length < 30) {
    const err = new Error('Não foi possível ler o texto deste PDF. O arquivo pode estar ilegível ou protegido.');
    err.status = 422;
    throw err;
  }

  // Divide o texto por páginas baseado no marcador --- PÁGINA X ---
  const pageRegex = /---\s*P[ÁA]GINA\s+(\d+)\s*---/gi;
  const parts = rawText.split(pageRegex);

  const pages = [];
  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i += 2) {
      const pageNum = parseInt(parts[i], 10);
      const text = (parts[i + 1] || '').trim();
      pages.push({ pageNumber: pageNum, text });
    }
  } else {
    pages.push({ pageNumber: 1, text: rawText.trim() });
  }

  return pages;
}

/**
 * Identifica uma seção, artigo ou cláusula em um bloco de texto
 * @param {string} text
 * @returns {string|null}
 */
function extractSectionRef(text) {
  if (!text) return null;

  const patterns = [
    /^(?:art(?:igo|\.)?\s*\d+[^.\n]*)/im,
    /^(?:cl[áa]usula\s*\d+[^.\n]*)/im,
    /^(?:cap[íi]tulo\s*[IVXLCDM\d]+[^.\n]*)/im,
    /^(?:se[çc][ãa]o\s*[IVXLCDM\d]+[^.\n]*)/im,
    /^(?:item\s*\d+(?:\.\d+)*[^.\n]*)/im,
    /^(?:\d+\.\d+(?:\.\d+)*\s+[^\n]+)/im,
    /^(?:(?:pergunta|dúvida|faq|q:)\s*[:.-]?[^\n]+)/im,
    /^(?:#+\s+[^\n]+)/m
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (match) {
      return match[0].replace(/^#+\s*/, '').trim().slice(0, 150);
    }
  }

  return null;
}

/**
 * Divide o conteúdo das páginas em trechos de ~1000 caracteres com sobreposição,
 * mantendo pares de pergunta/resposta e seções juntos quando possível.
 * @param {Array<{pageNumber: number, text: string}>} pages
 */
function chunkDocumentPages(pages) {
  const chunks = [];
  const TARGET_CHUNK_SIZE = 1000;
  const OVERLAP_SIZE = 150;

  for (const page of pages) {
    const pageText = (page.text || '').trim();
    if (!pageText) continue;

    // Detecta pares de pergunta e resposta (ex: P: ... R: ... ou Pergunta: ... Resposta: ...)
    const qaRegex = /(?:^|\n)(?:P:|Pergunta:|Q:|\d+\.)\s*([\s\S]*?)(?=(?:\n(?:P:|Pergunta:|Q:|\d+\.)|\n---|\n#+|$))/gi;
    const qaMatches = [];
    let match;

    while ((match = qaRegex.exec(pageText)) !== null) {
      const fullMatch = match[0].trim();
      if (fullMatch.length >= 30) {
        qaMatches.push(fullMatch);
      }
    }

    // Se identificou perguntas e respostas bem estruturadas, respeita essa divisão
    if (qaMatches.length >= 2) {
      for (const qaBlock of qaMatches) {
        const secRef = extractSectionRef(qaBlock) || `Página ${page.pageNumber}`;
        if (qaBlock.length <= TARGET_CHUNK_SIZE * 1.5) {
          chunks.push({
            page: page.pageNumber,
            sectionRef: secRef,
            content: qaBlock
          });
        } else {
          // Bloco muito longo: fatia com sobreposição
          let start = 0;
          while (start < qaBlock.length) {
            let end = start + TARGET_CHUNK_SIZE;
            if (end < qaBlock.length) {
              const breakPoint = qaBlock.lastIndexOf('\n', end);
              if (breakPoint > start + TARGET_CHUNK_SIZE * 0.6) {
                end = breakPoint;
              }
            }
            const slice = qaBlock.slice(start, end).trim();
            if (slice) {
              chunks.push({
                page: page.pageNumber,
                sectionRef: secRef,
                content: slice
              });
            }
            start = end - OVERLAP_SIZE;
            if (start >= qaBlock.length - OVERLAP_SIZE) break;
          }
        }
      }
      continue;
    }

    // Divisão padrão por parágrafos e seções
    const paragraphs = pageText.split(/\n\s*\n+/);
    let currentChunk = '';
    let currentSection = `Página ${page.pageNumber}`;

    for (const para of paragraphs) {
      const cleanPara = para.trim();
      if (!cleanPara) continue;

      const detectedSection = extractSectionRef(cleanPara);
      if (detectedSection) {
        currentSection = detectedSection;
      }

      if ((currentChunk.length + cleanPara.length) > TARGET_CHUNK_SIZE && currentChunk.length >= 300) {
        chunks.push({
          page: page.pageNumber,
          sectionRef: currentSection,
          content: currentChunk.trim()
        });
        // Preserva sobreposição pegando os últimos caracteres
        const overlap = currentChunk.slice(-OVERLAP_SIZE).trim();
        currentChunk = overlap ? `${overlap}\n\n${cleanPara}` : cleanPara;
      } else {
        currentChunk = currentChunk ? `${currentChunk}\n\n${cleanPara}` : cleanPara;
      }
    }

    if (currentChunk.trim()) {
      chunks.push({
        page: page.pageNumber,
        sectionRef: currentSection,
        content: currentChunk.trim()
      });
    }
  }

  return chunks;
}

/**
 * Divide texto em Markdown (políticas criadas na plataforma)
 * @param {string} markdownText
 */
function chunkMarkdownText(markdownText) {
  const chunks = [];
  const TARGET_CHUNK_SIZE = 1000;
  const OVERLAP_SIZE = 150;

  if (!markdownText || !markdownText.trim()) {
    return chunks;
  }

  // Divide por títulos markdown (## ou ###)
  const sections = markdownText.split(/(?=(?:^|\n)#{1,4}\s+)/);

  for (const sec of sections) {
    const cleanSec = sec.trim();
    if (!cleanSec) continue;

    const secRef = extractSectionRef(cleanSec) || 'Política Interna';

    if (cleanSec.length <= TARGET_CHUNK_SIZE * 1.3) {
      chunks.push({
        page: 1,
        sectionRef: secRef,
        content: cleanSec
      });
    } else {
      let start = 0;
      while (start < cleanSec.length) {
        let end = start + TARGET_CHUNK_SIZE;
        if (end < cleanSec.length) {
          const breakPoint = cleanSec.lastIndexOf('\n', end);
          if (breakPoint > start + TARGET_CHUNK_SIZE * 0.6) {
            end = breakPoint;
          }
        }
        const slice = cleanSec.slice(start, end).trim();
        if (slice) {
          chunks.push({
            page: 1,
            sectionRef: secRef,
            content: slice
          });
        }
        start = end - OVERLAP_SIZE;
        if (start >= cleanSec.length - OVERLAP_SIZE) break;
      }
    }
  }

  return chunks;
}

/**
 * Processa o upload de um arquivo PDF, extrai texto, divide em trechos e salva no banco
 */
async function processAndIndexPdf({ file, title, docType, version, publishDate, effectiveFrom, effectiveTo, audience, sourceOrg, userId }) {
  if (!file || !file.buffer) {
    const err = new Error('Nenhum arquivo enviado.');
    err.status = 400;
    throw err;
  }

  validatePdfBuffer(file.buffer);

  // 1. Extração por página com pdf-parse
  let extractionMethod = 'texto';
  const extractionResult = await extractPagesWithPdfParse(file.buffer);
  let pages = extractionResult.pages;

  // 2. Plano B para PDF escaneado (se texto útil < 50 chars)
  if (extractionResult.totalUsefulChars < 50) {
    pages = await ocrFallbackWithGemini(file.buffer);
    extractionMethod = 'ocr_ia';
  }

  // 3. Verifica dados pessoais
  const fullText = pages.map(p => p.text).join(' ');
  const piiCheck = detectPii(fullText);

  // 4. Divisão em trechos
  const chunks = chunkDocumentPages(pages);
  if (chunks.length === 0) {
    const err = new Error('Não foi possível gerar trechos pesquisáveis a partir deste PDF.');
    err.status = 422;
    throw err;
  }

  // 5. Versionamento automático: se já existe documento vigente com mesmo título
  const existing = await knowledgeRepository.findCurrentByTitle(title);
  const previousVersionId = existing ? existing.Id : null;

  // 6. Gravação transacional
  const docId = await knowledgeRepository.createDocumentWithChunks(
    {
      title: title.trim(),
      docType: docType || 'politica_interna',
      sourceOrg: sourceOrg ? sourceOrg.trim() : 'Interno',
      version: version.trim(),
      publishedAt: publishDate || null,
      effectiveFrom: effectiveFrom || null,
      effectiveTo: effectiveTo || null,
      fileName: file.originalname,
      uploadedBy: userId,
      audience: audience || 'rh',
      sourceKind: 'arquivo',
      indexStatus: 'indexado',
      indexError: null,
      extractionMethod,
      sizeBytes: file.size
    },
    chunks,
    previousVersionId
  );

  // 7. Invalidação do cache de busca em memória
  knowledgeRetrievalService.invalidateCache();

  // 8. Auditoria
  await auditLogRepository.log({
    userId,
    action: previousVersionId ? 'knowledge_document_new_version' : 'knowledge_document_uploaded',
    entityType: 'knowledge_document',
    entityId: String(docId),
    detailsJson: {
      title,
      docType,
      version,
      audience,
      chunkCount: chunks.length,
      extractionMethod,
      pageCount: pages.length,
      previousVersionId,
      piiWarnings: piiCheck.warnings
    }
  });

  return {
    id: docId,
    title,
    docType,
    version,
    audience,
    indexStatus: 'indexado',
    chunkCount: chunks.length,
    pageCount: pages.length,
    extractionMethod,
    previousVersionId,
    piiWarnings: piiCheck.warnings
  };
}

/**
 * Cria ou versiona uma política escrita em Markdown na plataforma
 */
async function processAndIndexPolicyText({ title, docType, version, publishDate, effectiveFrom, effectiveTo, audience, bodyText, userId, previousVersionId = null }) {
  if (!title || !title.trim()) {
    throw new Error('O título da política é obrigatório.');
  }
  if (!version || !version.trim()) {
    throw new Error('A versão da política é obrigatória.');
  }
  if (!bodyText || !bodyText.trim()) {
    throw new Error('O conteúdo da política (Markdown) é obrigatório.');
  }

  const piiCheck = detectPii(bodyText);
  const chunks = chunkMarkdownText(bodyText);

  if (chunks.length === 0) {
    throw new Error('O conteúdo fornecido não gerou nenhum trecho válido.');
  }

  // Se não foi passado previousVersionId explicitamente, verifica pelo título
  let prevId = previousVersionId;
  if (!prevId) {
    const existing = await knowledgeRepository.findCurrentByTitle(title);
    if (existing) {
      prevId = existing.Id;
    }
  }

  const docId = await knowledgeRepository.createDocumentWithChunks(
    {
      title: title.trim(),
      docType: docType || 'politica_interna',
      sourceOrg: 'Interno (RH)',
      version: version.trim(),
      publishedAt: publishDate || null,
      effectiveFrom: effectiveFrom || null,
      effectiveTo: effectiveTo || null,
      fileName: null,
      uploadedBy: userId,
      audience: audience || 'rh',
      sourceKind: 'texto',
      bodyText,
      indexStatus: 'indexado',
      indexError: null,
      extractionMethod: 'texto',
      sizeBytes: Buffer.byteLength(bodyText, 'utf8')
    },
    chunks,
    prevId
  );

  knowledgeRetrievalService.invalidateCache();

  await auditLogRepository.log({
    userId,
    action: prevId ? 'knowledge_policy_new_version' : 'knowledge_policy_created',
    entityType: 'knowledge_policy',
    entityId: String(docId),
    detailsJson: {
      title,
      docType,
      version,
      audience,
      chunkCount: chunks.length,
      previousVersionId: prevId,
      piiWarnings: piiCheck.warnings
    }
  });

  return {
    id: docId,
    title,
    docType,
    version,
    audience,
    indexStatus: 'indexado',
    chunkCount: chunks.length,
    previousVersionId: prevId,
    piiWarnings: piiCheck.warnings
  };
}

/**
 * Reindexa uma política escrita em Markdown
 */
async function reindexPolicy(documentId, userId) {
  const doc = await knowledgeRepository.getDocumentById(documentId);
  if (!doc) {
    const err = new Error('Documento não encontrado.');
    err.status = 404;
    throw err;
  }

  if (doc.sourceKind !== 'texto' || !doc.bodyText) {
    const err = new Error('A reindexação direta está disponível apenas para políticas escritas na plataforma. Para arquivos PDF, reenvie o documento.');
    err.status = 400;
    throw err;
  }

  const chunks = chunkMarkdownText(doc.bodyText);
  await knowledgeRepository.replaceChunks(documentId, chunks, 'texto');

  knowledgeRetrievalService.invalidateCache();

  await auditLogRepository.log({
    userId,
    action: 'knowledge_policy_reindexed',
    entityType: 'knowledge_policy',
    entityId: String(documentId),
    detailsJson: {
      title: doc.title,
      chunkCount: chunks.length
    }
  });

  return {
    id: documentId,
    title: doc.title,
    chunkCount: chunks.length,
    indexStatus: 'indexado'
  };
}

module.exports = {
  validatePdfBuffer,
  detectPii,
  extractPagesWithPdfParse,
  ocrFallbackWithGemini,
  chunkDocumentPages,
  chunkMarkdownText,
  processAndIndexPdf,
  processAndIndexPolicyText,
  reindexPolicy
};
