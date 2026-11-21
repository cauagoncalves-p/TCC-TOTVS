// backend/scripts/seed/ruleCodeMap.js
// Mapeamento entre códigos de regra internos do motor e os códigos do catálogo e gabarito no banco
module.exports = {
  ruleCodeMap: {
    'ESOCIAL_S2200': 'ESOCIAL_S2200_CHECKLIST',
    'ESOCIAL_S2230': 'ESOCIAL_S2230_CHECKLIST',
    'ESOCIAL_S2299': 'ESOCIAL_S2299_CHECKLIST'
  },
  resolveRuleCode: function (code) {
    return this.ruleCodeMap[code] || code;
  }
};
