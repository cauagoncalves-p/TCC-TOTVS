// frontend/src/features/retention/utils/retentionUtils.ts

/**
 * Formata tempo de casa em anos e meses amigáveis
 * Ex.: 27 meses -> "2 anos e 3 meses"; 8 meses -> "8 meses"
 */
export function formatTenure(months: number): string {
  if (!months || months <= 0) return 'menos de 1 mês';
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  }

  if (remainingMonths === 0) {
    return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  }

  return `${years} ${years === 1 ? 'ano' : 'anos'} e ${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`;
}

/**
 * Formata tempo desde a última movimentação de carreira
 * Ex.: "há 26 meses" ou "recente (< 1 mês)"
 */
export function formatLastMovement(months: number): string {
  if (months === undefined || months === null) return 'sem registro';
  if (months <= 0) return 'recente';
  if (months === 1) return 'há 1 mês';
  return `há ${months} meses`;
}

/**
 * Formata ausências para a coluna compacta "Último mês | 3 meses"
 * Ex.: "1 | 4"
 */
export function formatAbsenceCompact(lastMonth: number, recentTotal: number): string {
  const lm = lastMonth !== undefined && lastMonth !== null ? Math.round(lastMonth) : 0;
  const rt = recentTotal !== undefined && recentTotal !== null ? Math.round(recentTotal) : 0;
  return `${lm} | ${rt}`;
}

/**
 * Formata média de horas extras
 * Ex.: "18 h"
 */
export function formatOvertimeCompact(hours: number): string {
  if (!hours || hours <= 0) return '0 h';
  return `${Math.round(hours)} h`;
}
