// frontend/src/features/onboarding/utils/masks.ts

/**
 * Remove qualquer caractere não numérico
 */
export function cleanDigits(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).replace(/\D/g, '');
}

/**
 * Aplica máscara de CPF: 000.000.000-00
 */
export function maskCpf(value: string | null | undefined): string {
  if (!value) return '';
  const digits = cleanDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Mascara o CPF para exibição segura (LGPD): ***.***.***-00
 */
export function maskCpfHidden(value: string | null | undefined): string {
  if (!value) return '-';
  const digits = cleanDigits(value);
  if (digits.length !== 11) return value;
  return `***.***.***-${digits.slice(-2)}`;
}

/**
 * Aplica máscara de CEP: 00000-000
 */
export function maskCep(value: string | null | undefined): string {
  if (!value) return '';
  const digits = cleanDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

/**
 * Aplica máscara de telefone: (00) 00000-0000 ou (00) 0000-0000
 */
export function maskPhone(value: string | null | undefined): string {
  if (!value) return '';
  const digits = cleanDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Formata valor monetário para exibição (R$ 1.234,56)
 */
export function formatCurrencyDisplay(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  if (isNaN(num)) return String(value);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(num);
}

/**
 * Converte string digitada para float numérico válido
 */
export function parseCurrencyValue(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return isNaN(value) ? undefined : value;
  const clean = value.replace(/[^\d,-]/g, '').replace(',', '.');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? undefined : parsed;
}
