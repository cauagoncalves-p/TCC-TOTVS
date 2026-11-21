// frontend/src/features/tickets/api.ts
import { http } from '../../services/http';
import {
  Ticket,
  TicketMessage,
  CreateTicketInput,
  MyTicketsFilter,
  MyTicketsResponse,
  SendMessageResponse,
  RhTicketsFilter,
  RhTicketsResponse,
  TicketCounts
} from './types';

function normalizeMessage(m: any): TicketMessage {
  if (!m) return {} as TicketMessage;
  return {
    id: Number(m.id ?? m.Id),
    ticketId: Number(m.ticketId ?? m.TicketId),
    authorUserId: Number(m.authorUserId ?? m.AuthorUserId),
    authorRole: m.authorRole ?? m.AuthorRole,
    content: m.content ?? m.Content ?? '',
    createdAt: m.createdAt ?? m.CreatedAt,
    authorName: m.authorName ?? m.AuthorName
  };
}

function normalizeTicket(t: any): Ticket {
  if (!t) return {} as Ticket;
  return {
    id: Number(t.id ?? t.Id),
    requesterUserId: Number(t.requesterUserId ?? t.RequesterUserId),
    requesterName: t.requesterName ?? t.RequesterName,
    requesterDepartment: t.requesterDepartment ?? t.RequesterDepartment,
    subject: t.subject ?? t.Subject,
    category: t.category ?? t.Category,
    status: t.status ?? t.Status,
    assignedTo: t.assignedTo !== undefined ? t.assignedTo : (t.AssignedTo !== undefined ? t.AssignedTo : null),
    assignedToName: t.assignedToName ?? t.AssignedToName ?? null,
    sessionId: t.sessionId ?? t.SessionId ?? null,
    createdAt: t.createdAt ?? t.CreatedAt,
    updatedAt: t.updatedAt ?? t.UpdatedAt,
    lastMessageAt: t.lastMessageAt ?? t.LastMessageAt,
    lastMessageRole: t.lastMessageRole ?? t.LastMessageRole,
    resolvedAt: t.resolvedAt ?? t.ResolvedAt ?? null,
    resolvedBy: t.resolvedBy ?? t.ResolvedBy ?? null,
    resolvedByName: t.resolvedByName ?? t.ResolvedByName ?? null,
    requester: t.requester ? {
      id: Number(t.requester.id ?? t.requester.Id),
      email: t.requester.email ?? t.requester.Email,
      fullName: t.requester.fullName ?? t.requester.FullName,
      registration: t.requester.registration ?? t.requester.Registration ?? null,
      department: t.requester.department ?? t.requester.Department ?? null,
      jobTitle: t.requester.jobTitle ?? t.requester.JobTitle ?? null
    } : undefined,
    messages: Array.isArray(t.messages) ? t.messages.map(normalizeMessage) : undefined
  };
}

export const ticketsApi = {
  /**
   * Cria chamado e a 1ª mensagem
   * POST /api/tickets
   */
  async createTicket(input: CreateTicketInput): Promise<Ticket> {
    const res = await http.post('/api/tickets', input);
    return normalizeTicket(res.data);
  },

  /**
   * Lista os chamados do próprio colaborador
   * GET /api/tickets/mine
   */
  async getMyTickets(filters?: MyTicketsFilter): Promise<MyTicketsResponse> {
    const params: Record<string, any> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;

    const res = await http.get<MyTicketsResponse>('/api/tickets/mine', { params });
    const raw = res.data;
    return {
      tickets: Array.isArray(raw.tickets) ? raw.tickets.map(normalizeTicket) : [],
      total: raw.total || 0,
      page: raw.page || 1,
      limit: raw.limit || 10,
      totalPages: raw.totalPages || 1
    };
  },

  /**
   * Busca chamado por ID
   * GET /api/tickets/:id
   */
  async getTicketById(id: number | string): Promise<Ticket> {
    const res = await http.get(`/api/tickets/${id}`);
    return normalizeTicket(res.data);
  },

  /**
   * Envia uma mensagem em um chamado
   * POST /api/tickets/:id/messages
   */
  async sendMessage(ticketId: number | string, content: string): Promise<SendMessageResponse> {
    const res = await http.post(`/api/tickets/${ticketId}/messages`, { content });
    return {
      message: normalizeMessage(res.data.message),
      ticket: res.data.ticket ? normalizeTicket(res.data.ticket) : {}
    };
  },

  /**
   * Marca chamado como resolvido
   * PATCH /api/tickets/:id/resolve
   */
  async resolveTicket(ticketId: number | string): Promise<Ticket> {
    const res = await http.patch(`/api/tickets/${ticketId}/resolve`);
    return normalizeTicket(res.data);
  },

  /**
   * Lista todos os chamados (RH)
   * GET /api/tickets
   */
  async getAllTickets(filters?: RhTicketsFilter): Promise<RhTicketsResponse> {
    const params: Record<string, any> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.assigned) params.assigned = filters.assigned;
    if (filters?.category) params.category = filters.category;
    if (filters?.q) params.q = filters.q;
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;
    const res = await http.get('/api/tickets', { params });
    const raw = res.data;
    return {
      tickets: Array.isArray(raw.tickets) ? raw.tickets.map(normalizeTicket) : [],
      total: raw.total || 0,
      page: raw.page || 1,
      limit: raw.limit || 20,
      totalPages: raw.totalPages || 1
    };
  },

  /**
   * Conta chamados por situação (RH)
   * GET /api/tickets/counts
   */
  async getCounts(): Promise<TicketCounts> {
    const res = await http.get('/api/tickets/counts');
    const d = res.data;
    return {
      openUnassigned: Number(d.openUnassigned ?? 0),
      assignedToMe: Number(d.assignedToMe ?? 0),
      answered: Number(d.answered ?? 0),
      resolved: Number(d.resolved ?? 0),
      total: Number(d.total ?? 0)
    };
  },

  /**
   * Assume ou libera um chamado (RH)
   * PATCH /api/tickets/:id/assign
   */
  async assignTicket(ticketId: number | string, action: 'assume' | 'release'): Promise<Ticket> {
    const res = await http.patch(`/api/tickets/${ticketId}/assign`, { action });
    return normalizeTicket(res.data);
  }
};
