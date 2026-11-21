// backend/src/config/retentionScore.js

/**
 * Configuração do modelo de índice de atenção para retenção (regras-v1)
 * Regras transparentes, auditáveis e explicáveis baseadas em heurísticas.
 *
 * LIMITES ÉTICOS E LEGAIS:
 * - Não usa machine learning caixa-preta.
 * - Não usa motivos de ausência, dados de saúde, afastamentos legais,
 *   idade, gênero, estado civil, valores de salário ou pesquisa de clima anônima.
 */

const RETENTION_RULES_V1 = {
  version: 'regras-v1',
  name: 'Modelo Heurístico de Sinais de Carga, Ausência e Estagnação',
  description: 'Calcula o índice de atenção individual com base no desvio da mediana departamental e histórico recente.',

  thresholds: {
    lowMax: 34,         // 0 a 34 -> Baixa
    moderateMin: 35,    // 35 a 64 -> Moderada
    moderateMax: 64,
    highMin: 65,        // 65 a 100 -> Alta
  },

  windows: {
    recentMonths: 3,    // M-1 a M-3
    previousMonths: 3,  // M-4 a M-6
    minTenureDays: 90,  // Menos de 90 dias = dados insuficientes
    minValidMonths: 3,  // Menos de 3 meses com dados = dados insuficientes
  },

  components: {
    overtime: {
      key: 'sobrecarga',
      name: 'Sobrecarga de Horas Extras',
      maxPoints: 40,
      description: 'Média de horas extras dos últimos 3 meses comparada à mediana do departamento.',
      // Razão 1.0 = 0 pts; Razão >= 2.0 = 40 pts
      baselineRatio: 1.0,
      maxRatio: 2.0,
    },
    absences: {
      key: 'ausencias',
      name: 'Ausências e Crescimento',
      maxPoints: 40,
      levelPointsMax: 25,     // Razão 1.0 = 0 pts; Razão >= 3.0 = 25 pts
      growthPointsMax: 15,    // Crescimento em relação ao trimestre anterior (0% = 0 pts; >= 100% = 15 pts)
      baselineRatio: 1.0,
      maxRatio: 3.0,
      description: 'Total de faltas dos últimos 3 meses comparado à mediana do setor (25 pts) + crescimento trimestral (15 pts).',
    },
    stagnation: {
      key: 'estagnacao',
      name: 'Estagnação de Carreira',
      maxPoints: 20,
      minMonths: 12,          // Até 12 meses = 0 pts
      maxMonths: 30,          // 30 meses ou mais = 20 pts
      description: 'Tempo decorrido desde a última movimentação de carreira (admissão, reajuste, promoção ou mudança de cargo).',
    }
  },

  disclaimers: {
    restrictedUse: 'Uso restrito ao RH para apoio à retenção e cuidado com as equipes.',
    prohibitedUses: 'Nunca usar como base para demissão, punição, corte de benefícios ou decisão automática.',
    excludedData: [
      'Motivos de ausência ou dados médicos/atestados',
      'Afastamentos legais (maternidade, paternidade, auxílio-doença)',
      'Salário ou valores de remuneração',
      'Idade, gênero, raça, religião ou estado civil',
      'Respostas de pesquisas de clima organizacional'
    ]
  }
};

module.exports = RETENTION_RULES_V1;
