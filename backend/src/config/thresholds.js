// backend/src/config/thresholds.js

/**
 * Limites e parâmetros de referência para o motor de regras de risco (Fase A).
 * Valores ajustáveis de acordo com a política e o porte da empresa.
 */
module.exports = {
  // Limite de horas extras por colaborador (médio mensal) para caracterizar sobrecarga crônica
  CHRONIC_OVERTIME_HOURS_PER_EMPLOYEE: 15.0,

  // Percentual mínimo acima da média da empresa para elevar o risco de ABS_OT_UP para 'alto' (20%)
  COMPANY_AVERAGE_SURPASS_RATIO: 1.20,

  // Percentual de aumento do absenteísmo vs. média dos 3 meses anteriores para sinal precoce (30%)
  ABSENCE_SPIKE_RATIO: 1.30,

  // Taxa mínima de turnover mensal para caracterizar alta pós-absenteísmo (ex.: 4.0% ou salto de 50%)
  TURNOVER_HIGH_RATE: 4.0,
  TURNOVER_SPIKE_RATIO: 1.50,

  // Pesos para cálculo de concentração de risco (Hotspots)
  RISK_WEIGHTS: {
    alto: 3,
    moderado: 2,
    baixo: 1
  }
};
