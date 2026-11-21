// frontend/src/features/tickets/types.ts

export type TicketCategory =
  | 'ferias'
  | 'holerite'
  | 'beneficios'
  | 'ponto'
  | 'documentos'
  | 'politicas'
  | 'outros';

export type TicketStatus =
  | 'aberto'
  | 'em_atendimento'
  | 'respondido'
  | 'resolvido';

export type TicketRole = 'colaborador' | 'rh';

export interface TicketRequester {
  id: number;
  email: string;
  fullName: string;
  registration?: string | null;
  department?: string | null;
  jobTitle?: string | null;
}

export interface TicketMessage {
  id: number;
  ticketId: number;
  authorUserId: number;
  authorRole: TicketRole;
  content: string;
  createdAt: string;
  authorName?: string;
}

export interface Ticket {
  id: number;
  requesterUserId: number;
  requesterName?: string;
  requesterDepartment?: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  assignedTo: number | null;
  assignedToName: string | null;
  sessionId: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  lastMessageRole: TicketRole;
  resolvedAt: string | null;
  resolvedBy: number | null;
  resolvedByName?: string | null;
  requester?: TicketRequester;
  messages?: TicketMessage[];
}

export interface CreateTicketInput {
  subject: string;
  category: TicketCategory;
  message: string;
  sessionId?: string;
}

export interface MyTicketsFilter {
  status?: TicketStatus | '';
  page?: number;
  limit?: number;
}

export interface MyTicketsResponse {
  tickets: Ticket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SendMessageResponse {
  message: TicketMessage;
  ticket: Partial<Ticket>;
}

export interface RhTicketsFilter {
  status?: TicketStatus | '';
  assigned?: 'none' | 'me' | '';
  category?: TicketCategory | '';
  q?: string;
  page?: number;
  limit?: number;
}

export interface RhTicketsResponse {
  tickets: Ticket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TicketCounts {
  openUnassigned: number;
  assignedToMe: number;
  answered: number;
  resolved: number;
  total: number;
}
