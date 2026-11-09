/**
 * Utilitários e formatadores oficiais para o TOTVS RH Inteligente
 */

// Mascaramento de CPF (ex.: ***.***.***-25)
export function maskCpf(cpf: string | null | undefined): string {
  if (!cpf) return '-';
  const clean = String(cpf).replace(/\D/g, '');
  if (clean.length !== 11) return cpf;
  return `***.***.***-${clean.slice(-2)}`;
}

// Formatação monetária (BRL)
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Formatação percentual
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
}

// Formatação de data (AAAA-MM-DD para DD/MM/AAAA)
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const clean = String(dateStr).split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Formatação de competência (AAAA-MM para MM/AAAA)
export function formatCompetence(compStr: string | null | undefined): string {
  if (!compStr) return '-';
  const parts = compStr.split('-');
  if (parts.length >= 2) {
    return `${parts[1]}/${parts[0]}`;
  }
  return compStr;
}
