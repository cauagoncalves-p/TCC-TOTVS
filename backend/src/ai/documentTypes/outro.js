// backend/src/ai/documentTypes/outro.js

const schemaDescription = `Retorne estritamente um JSON com o seguinte formato:
{
  "title": string | null,
  "summary": string | null,
  "fields": [
    {
      "label": string,
      "value": string
    }
  ]
}`;

module.exports = {
  id: 'outro',
  label: 'Outro Documento',
  priority: 5,
  classificationHint: 'Qualquer outro documento administrativo, comprobatório ou geral que não seja ficha de admissão nem currículo profissional.',
  schemaDescription,

  toCadastro(extracted) {
    // Nada automático para tipo outro
    return {};
  },

  toPerfil(extracted) {
    return null;
  }
};
