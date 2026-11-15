// backend/src/services/knowledgePolicyService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const knowledgeIngestionService = require('./knowledgeIngestionService');
const knowledgeRepository = require('../repositories/knowledgeRepository');

/**
 * Cria uma nova política interna em texto Markdown na plataforma
 */
async function createPolicy(params) {
  return await knowledgeIngestionService.processAndIndexPolicyText(params);
}

/**
 * Atualiza uma política existente gerando uma NOVA versão (a anterior vira histórico com IsCurrent = 0)
 */
async function updatePolicy(id, params) {
  const currentDoc = await knowledgeRepository.getDocumentById(id);
  if (!currentDoc) {
    const err = new Error('Documento não encontrado para versionamento.');
    err.status = 404;
    throw err;
  }

  return await knowledgeIngestionService.processAndIndexPolicyText({
    ...params,
    previousVersionId: currentDoc.id
  });
}

/**
 * Gera uma sugestão de reorganização do texto em perguntas e respostas / tópicos via Gemini.
 * Regra: NÃO inventar regras, prazos ou números que não estejam no texto.
 * @param {string} rawText
 */
async function structurePreview(rawText) {
  if (!rawText || !rawText.trim()) {
    throw new Error('O texto base para sugestão de estrutura é obrigatório.');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Retorno fallback se a chave não estiver disponível
    return {
      suggestedMarkdown: `# Política Interna\n\n## 1. Objetivo\n\n${rawText.trim()}\n\n## 2. Perguntas Frequentes (FAQ)\n\n**P: Como se aplica esta regra?**\n*R: Conforme detalhado acima.*`,
      disclaimer: 'Sugestão gerada localmente. Revise e edite o texto antes de publicar.'
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: `Você é um especialista em estruturação de políticas internas de Recursos Humanos (RH) e conformidade trabalhista.
Sua missão é reorganizar o rascunho de texto fornecido pelo usuário em um formato Markdown claro, profissional e otimizado para busca por IA (RAG).

REGRAS ESTRITAS (INVIOLÁVEIS):
1. NUNCA adicione regras, exceções, prazos, penalidades ou valores que NÃO estejam explicitamente mencionados no texto original.
2. Não invente números de leis ou artigos que o autor não citou.
3. Organize o texto seguindo este modelo:
   # [Título sugerido ou original]
   ## 1. Resumo Rápido
   ## 2. Objetivo e Abrangência
   ## 3. Definições e Regras Principais
   ## 4. O que Fazer na Prática
   ## 5. Exceções (ou declarar "Não há exceções nesta versão")
   ## 6. Perguntas Frequentes (FAQ em pares de Pergunta e Resposta claras)
   > **Aviso:** Esta é uma política interna da empresa.
4. O resultado final deve ser apenas o texto em Markdown, pronto para o RH revisar e editar.`
  });

  const prompt = `Texto rascunho do RH para estruturar:\n\n${rawText}`;
  const response = await model.generateContent(prompt);
  const suggestedMarkdown = response.response.text();

  return {
    suggestedMarkdown,
    disclaimer: 'Esta é apenas uma sugestão gerada pela IA para facilitar a consulta. Revise cuidadosamente antes de salvar e publicar.'
  };
}

module.exports = {
  createPolicy,
  updatePolicy,
  structurePreview
};
