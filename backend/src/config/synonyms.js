// backend/src/config/synonyms.js

/**
 * Dicionário de sinônimos e termos correlatos para a busca na Base de Conhecimento Trabalhista e Políticas.
 * As chaves e valores devem estar normalizados (minúsculas, sem acento).
 */
const SYNONYMS = {
  // Aprendizagem
  'aprendiz': ['aprendizes', 'jovem aprendiz', 'menor aprendiz', 'contrato de aprendizagem', 'programa de aprendizagem'],
  'aprendizes': ['aprendiz', 'jovem aprendiz', 'menor aprendiz'],
  'jovem aprendiz': ['aprendiz', 'aprendizes'],

  // Eventos / Viagens
  'evento': ['eventos', 'feira', 'feiras', 'congresso', 'congressos', 'convencao', 'convencoes', 'seminario', 'seminarios', 'workshop', 'workshops', 'externo', 'externos', 'viagem', 'viagens'],
  'eventos': ['evento', 'feira', 'feiras', 'congresso', 'congressos', 'convencao', 'seminario', 'workshop', 'externo'],
  'feira': ['feiras', 'evento', 'eventos', 'congresso', 'convencao', 'externo', 'viagem'],
  'feiras': ['feira', 'evento', 'eventos', 'congresso', 'convencao', 'externo'],
  'congresso': ['congressos', 'evento', 'eventos', 'feira', 'seminario', 'convencao'],
  'viagem': ['viagens', 'deslocamento', 'diarias', 'externo'],

  // Rescisão e Desligamento
  'rescisao': ['demissao', 'desligamento', 'dispensa', 'rescisorio', 'verbas rescisorias', 'aviso previo', 'demitido', 'acerto'],
  'demissao': ['rescisao', 'desligamento', 'dispensa', 'acerto', 'verbas'],
  'desligamento': ['rescisao', 'demissao', 'dispensa', 'saida'],
  'aviso previo': ['aviso', 'rescisao', 'prazo rescisorio'],

  // Férias e Afastamentos
  'ferias': ['recesso', 'fracionamento', 'periodo aquisitivo', 'periodo concessivo', 'abono pecuniario', 'descanso'],
  'abono': ['abono pecuniario', 'venda de ferias', 'converter ferias'],
  'afastamento': ['licenca', 'auxilio-doenca', 'atestado', 'acidente de trabalho', 'cat', 'afastado', 'inss'],
  'atestado': ['afastamento', 'licenca medica', 'declaracao medica', 'falta justificada'],
  'licenca': ['afastamento', 'licenca maternidade', 'licenca paternidade', 'licenca casamento'],

  // Jornada e Ponto
  'banco de horas': ['compensacao', 'horas extras', 'sobrejornada', 'compensacao de jornada', 'acordo individual'],
  'compensacao': ['banco de horas', 'horas extras', 'acordo de compensacao'],
  'horas extras': ['hora extra', 'sobrejornada', 'adicional extraordinario', 'banco de horas'],
  'ponto': ['registro de ponto', 'jornada', 'espelho de ponto', 'batida'],

  // Remuneração e Benefícios
  'holerite': ['contracheque', 'recibo de pagamento', 'demonstrativo de pagamento', 'salario'],
  'salario': ['remuneracao', 'vencimentos', 'proventos', 'holerite', 'piso salarial'],
  'beneficio': ['beneficios', 'vale-transporte', 'vt', 'vale-refeicao', 'vr', 'vale-alimentacao', 'va', 'plano de saude'],
  'vale-transporte': ['vt', 'transporte', 'desconto vale transporte'],

  // eSocial e Legislação
  'esocial': ['mos', 'leiaute', 'manual de orientacao', 'evento', 'transmissao', 's-2230', 's-2210', 's-1200'],
  'mos': ['manual de orientacao do esocial', 'esocial'],
  'clt': ['consolidacao das leis do trabalho', 'legislacao trabalhista', 'lei trabalhista', 'artigo', 'art.'],
  'cct': ['convencao coletiva', 'acordo coletivo', 'act', 'sindicato', 'clausula'],
  'acordo coletivo': ['cct', 'act', 'convencao coletiva de trabalho', 'convencao']
};

/**
 * Remove acentos de um texto
 * @param {string} str
 * @returns {string}
 */
function removeAccents(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normaliza um termo (minúsculo, sem acentos, sem pontuação nas extremidades)
 * @param {string} term
 * @returns {string}
 */
function normalizeTerm(term) {
  return removeAccents(term || '').toLowerCase().trim().replace(/^[^\w]+|[^\w]+$/g, '');
}

/**
 * Retorna os sinônimos de um termo
 * @param {string} term
 * @returns {string[]}
 */
function getSynonyms(term) {
  const norm = normalizeTerm(term);
  if (!norm) return [];
  const direct = SYNONYMS[norm] || [];
  return [norm, ...direct.map(normalizeTerm)];
}

/**
 * Expande uma lista de palavras-chave com seus sinônimos
 * @param {string[]} terms
 * @returns {string[]}
 */
function expandTerms(terms) {
  const set = new Set();
  for (const t of terms) {
    const list = getSynonyms(t);
    list.forEach(item => {
      if (item) set.add(item);
    });
  }
  return Array.from(set);
}

module.exports = {
  SYNONYMS,
  removeAccents,
  normalizeTerm,
  getSynonyms,
  expandTerms
};
