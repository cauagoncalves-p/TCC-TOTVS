// backend/src/config/complianceLimits.js

/**
 * Limites e parâmetros de referência para o motor de compliance.
 * NOTA: Limites e referências com base legal oficial devem ser conferidos
 * no texto legal vigente antes de marcar SourceVerified = 1.
 */
module.exports = {
  // Jornada semanal máxima padrão (a conferir no texto vigente da CLT e CF)
  MAX_WEEKLY_HOURS: 44.0,

  // Idade mínima de admissão em anos (a conferir no texto vigente da CF e CLT)
  MIN_ADMISSION_AGE: 14,

  // Limite razoável de dias no futuro para data de admissão
  MAX_FUTURE_HIRE_DAYS: 30
};
