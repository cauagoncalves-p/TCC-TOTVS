// frontend/src/styles/chartColors.ts
// Paleta centralizada de cores para gráficos Recharts baseada nos tokens TOTVS

export const chartColors = {
  // Série principal e destaques
  brandPrimary: '#1E6BFF',   // --brand-500
  brandDark: '#0B2447',      // --brand-900
  accentCyan: '#12B5E5',     // --accent-cyan
  purple: '#6366F1',         // Cor de apoio para categorias

  // Semânticos de apoio para métricas e riscos
  riskHigh: '#A31515',       // --risk-high
  riskModerate: '#7A4A00',   // --risk-moderate
  riskLow: '#1B5E20',        // --risk-low

  // Variações vivas para gráficos de preenchimento (barras / linhas)
  amberChart: '#F59E0B',
  greenChart: '#10B981',
  redChart: '#EF4444',
  blueChart: '#3B82F6',

  // Elementos estruturais dos gráficos
  grid: '#D9DFEA',           // --border
  gridLight: '#F1F5F9',
  axis: '#4B5563',           // --text-secondary
  tooltipBg: '#071427',      // --brand-950
  tooltipBorder: '#19376D',  // --brand-700
  tooltipText: '#FFFFFF'
};

/**
 * Paleta de 6 cores distintas para séries sequenciais
 */
export const seriesPalette = [
  chartColors.brandPrimary, // 1. Azul TOTVS
  chartColors.accentCyan,   // 2. Ciano de realce
  chartColors.amberChart,   // 3. Âmbar
  chartColors.greenChart,   // 4. Verde
  chartColors.purple,       // 5. Roxo
  chartColors.redChart      // 6. Vermelho
];

/**
 * Retorna cor baseada em score de risco (hotspots e alertas)
 */
export function getHotspotRiskColor(score: number): string {
  if (score >= 7) return chartColors.redChart;
  if (score >= 4) return chartColors.amberChart;
  return chartColors.greenChart;
}

/**
 * Retorna cor de prioridade para compliance
 */
export function getPriorityChartColor(priority: string): string {
  const norm = priority.toLowerCase();
  if (norm === 'alta') return chartColors.redChart;
  if (norm === 'média' || norm === 'media') return chartColors.amberChart;
  return chartColors.brandPrimary;
}
