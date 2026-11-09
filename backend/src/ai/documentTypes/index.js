// backend/src/ai/documentTypes/index.js
const fichaAdmissao = require('./fichaAdmissao');
const curriculo = require('./curriculo');
const outro = require('./outro');

const documentTypes = [
  fichaAdmissao,
  curriculo,
  outro
];

const documentTypesMap = new Map(documentTypes.map(t => [t.id, t]));

function getTypeById(id) {
  if (!id) return null;
  return documentTypesMap.get(id.toLowerCase().trim()) || null;
}

function getDefaultType() {
  return outro;
}

function listTypes() {
  return documentTypes.map(t => ({
    id: t.id,
    label: t.label,
    classificationHint: t.classificationHint
  }));
}

function getClassificationPromptContext() {
  return documentTypes.map(t => `- "${t.id}": ${t.classificationHint}`).join('\n');
}

module.exports = {
  documentTypes,
  getTypeById,
  getDefaultType,
  listTypes,
  getClassificationPromptContext
};
