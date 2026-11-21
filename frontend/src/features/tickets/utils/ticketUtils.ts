// frontend/src/features/tickets/utils/ticketUtils.ts

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Formata data e hora de forma completa (para tooltips e leitores de tela)
 */
export function formatFullDateTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr || '';
  }
}

/**
 * Formata um carimbo de data/hora em tempo relativo amigável
 */
export function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const now = Date.now();
    const diffMs = now - date.getTime();

    if (diffMs < 0) return 'agora';

    const diffSeconds = Math.floor(diffMs / 1000);
    if (diffSeconds < 60) return 'há poucos segundos';

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      return diffMinutes === 1 ? 'há 1 minuto' : `há ${diffMinutes} minutos`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return diffHours === 1 ? 'há 1 hora' : `há ${diffHours} horas`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'ontem';
    if (diffDays < 7) return `há ${diffDays} dias`;

    return formatFullDateTime(dateStr);
  } catch {
    return dateStr || '';
  }
}

/**
 * Verifica se um chamado resolvido ainda está dentro da janela de reabertura de 7 dias
 */
export function canReopenTicket(resolvedAt?: string | null): boolean {
  if (!resolvedAt) return false;
  try {
    const resDate = new Date(resolvedAt).getTime();
    if (isNaN(resDate)) return false;
    return Date.now() - resDate <= SEVEN_DAYS_MS;
  } catch {
    return false;
  }
}

/**
 * Calcula quantos dias restantes o colaborador tem para reabrir o chamado
 */
export function getReopenDaysRemaining(resolvedAt?: string | null): number {
  if (!resolvedAt) return 0;
  try {
    const resDate = new Date(resolvedAt).getTime();
    if (isNaN(resDate)) return 0;
    const diffMs = SEVEN_DAYS_MS - (Date.now() - resDate);
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  } catch {
    return 0;
  }
}
