// frontend/src/features/tickets/labels.ts
import { TicketCategory, TicketStatus, TicketRole } from './types';

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  ferias: 'Férias',
  holerite: 'Holerite',
  beneficios: 'Benefícios',
  ponto: 'Ponto',
  documentos: 'Documentos',
  politicas: 'Políticas',
  outros: 'Outros'
};

export const CATEGORIES_LIST: Array<{ value: TicketCategory; label: string }> = [
  { value: 'ferias', label: 'Férias' },
  { value: 'holerite', label: 'Holerite' },
  { value: 'beneficios', label: 'Benefícios' },
  { value: 'ponto', label: 'Ponto' },
  { value: 'documentos', label: 'Documentos' },
  { value: 'politicas', label: 'Políticas' },
  { value: 'outros', label: 'Outros' }
];

export function getStatusLabel(status: TicketStatus, role: TicketRole = 'colaborador'): string {
  if (role === 'rh') {
    switch (status) {
      case 'aberto':
        return 'Aberto';
      case 'em_atendimento':
        return 'Em atendimento';
      case 'respondido':
        return 'Aguardando o colaborador';
      case 'resolvido':
        return 'Resolvido';
      default:
        return status;
    }
  }

  // Colaborador
  switch (status) {
    case 'aberto':
      return 'Aguardando o RH';
    case 'em_atendimento':
      return 'Em atendimento';
    case 'respondido':
      return 'Respondido pelo RH';
    case 'resolvido':
      return 'Resolvido';
    default:
      return status;
  }
}

export const formatTicketStatus = getStatusLabel;

export function formatTicketCategory(category: TicketCategory): string {
  return CATEGORY_LABELS[category] || category;
}

