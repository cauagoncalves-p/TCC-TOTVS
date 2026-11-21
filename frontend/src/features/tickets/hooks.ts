// frontend/src/features/tickets/hooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsApi } from './api';
import {
  CreateTicketInput,
  MyTicketsFilter,
  MyTicketsResponse,
  Ticket,
  RhTicketsFilter,
  RhTicketsResponse,
  TicketCounts
} from './types';

/**
 * Consulta os próprios chamados do colaborador com atualização periódica
 */
export function useMyTickets(filters?: MyTicketsFilter) {
  return useQuery<MyTicketsResponse, Error>({
    queryKey: ['tickets', 'mine', filters?.status || '', filters?.page || 1, filters?.limit || 10],
    queryFn: () => ticketsApi.getMyTickets(filters),
    refetchInterval: 60000, // Atualiza a cada ~60s
    refetchOnWindowFocus: true
  });
}

/**
 * Consulta um chamado por ID com atualização periódica ativa
 */
export function useTicket(id: number | string | undefined) {
  return useQuery<Ticket, Error>({
    queryKey: ['ticket', id ? String(id) : ''],
    queryFn: () => ticketsApi.getTicketById(id!),
    enabled: Boolean(id),
    refetchInterval: 30000, // Atualiza a cada ~30s na tela de detalhes
    refetchOnWindowFocus: true
  });
}

/**
 * Criação de chamado pelo colaborador
 */
export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTicketInput) => ticketsApi.createTicket(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', 'mine'] });
    }
  });
}

/**
 * Envio de mensagem no chamado
 */
export function useSendMessage(ticketId: number | string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => ticketsApi.sendMessage(ticketId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', String(ticketId)] });
      queryClient.invalidateQueries({ queryKey: ['tickets', 'mine'] });
    }
  });
}

/**
 * Resolução do chamado
 */
export function useResolveTicket(ticketId: number | string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => ticketsApi.resolveTicket(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', String(ticketId)] });
      queryClient.invalidateQueries({ queryKey: ['tickets', 'mine'] });
    }
  });
}

/**
 * Lista todos os chamados (RH) com filtros e paginação
 */
export function useAllTickets(filters?: RhTicketsFilter) {
  return useQuery<RhTicketsResponse, Error>({
    queryKey: ['tickets', 'rh', filters?.status || '', filters?.assigned || '', filters?.category || '', filters?.q || '', filters?.page || 1],
    queryFn: () => ticketsApi.getAllTickets(filters),
    refetchInterval: 30000,
    refetchOnWindowFocus: true
  });
}

/**
 * Contagens de chamados por situação (RH)
 */
export function useTicketCounts() {
  return useQuery<TicketCounts, Error>({
    queryKey: ['tickets', 'counts'],
    queryFn: () => ticketsApi.getCounts(),
    refetchInterval: 30000,
    refetchOnWindowFocus: true
  });
}

/**
 * Assume ou libera um chamado (RH)
 */
export function useAssignTicket(ticketId: number | string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: 'assume' | 'release') => ticketsApi.assignTicket(ticketId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', String(ticketId)] });
      queryClient.invalidateQueries({ queryKey: ['tickets', 'rh'] });
      queryClient.invalidateQueries({ queryKey: ['tickets', 'counts'] });
    }
  });
}
