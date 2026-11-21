import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, UserCheck, UserX, Loader2, AlertCircle } from 'lucide-react';
import { useTicket, useSendMessage, useResolveTicket, useAssignTicket } from '../../features/tickets/hooks';
import { RequesterCard } from '../../features/tickets/components/RequesterCard';
import { NewMessageBanner } from '../../features/tickets/components/NewMessageBanner';
import { MessageBubble } from '../../features/tickets/components/MessageBubble';
import { ReplyBox } from '../../features/tickets/components/ReplyBox';
import { ResolveButton } from '../../features/tickets/components/ResolveButton';
import { TicketStatusBadge } from '../../features/tickets/components/TicketStatusBadge';
import { CategoryChip } from '../../features/tickets/components/CategoryChip';
import { formatFullDateTime, formatRelativeTime } from '../../features/tickets/utils/ticketUtils';
import { authService } from '../../services/authService';
import { notificationStore } from '../../features/compliance/notifications';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { cn } from '../../lib/utils';

export const RhTicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = authService.getUser();
  const currentUserId = user?.id;

  const { data: ticket, isLoading, isError } = useTicket(id);
  const sendMessageMutation = useSendMessage(id!);
  const resolveTicketMutation = useResolveTicket(id!);
  const assignMutation = useAssignTicket(id!);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  // Track message count for new message detection
  const [lastSeenCount, setLastSeenCount] = useState<number | null>(null);
  const [newMessageFrom, setNewMessageFrom] = useState<string | null>(null);

  // Duplicate reply warning
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [pendingContent, setPendingContent] = useState<string | null>(null);

  // Resolve confirm
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Initial scroll to bottom and set lastSeenCount
  useEffect(() => {
    if (ticket?.messages && lastSeenCount === null) {
      setLastSeenCount(ticket.messages.length);
      scrollToBottom();
    }
  }, [ticket?.messages, lastSeenCount, scrollToBottom]);

  // Detect new messages from another RH while user might be typing
  useEffect(() => {
    if (!ticket?.messages || lastSeenCount === null) return;
    const currentCount = ticket.messages.length;
    if (currentCount > lastSeenCount) {
      const newMsgs = ticket.messages.slice(lastSeenCount);
      const rhMsg = newMsgs.find(m => m.authorRole === 'rh' && m.authorUserId !== currentUserId);
      if (rhMsg) {
        setNewMessageFrom(rhMsg.authorName || 'RH');
      }
    }
  }, [ticket?.messages?.length, lastSeenCount, currentUserId]);

  // Mark notification as read on mount
  useEffect(() => {
    if (!id) return;
    const notifs = notificationStore.getNotifications();
    notifs.forEach(n => {
      if ((n.type === 'chamado_novo' || n.type === 'chamado_mensagem') && String(n.refId) === String(id) && !n.isRead) {
        notificationStore.markAsRead(n.id);
      }
    });
  }, [id]);

  const handleSendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!content.trim()) return false;

    // Check for potential duplicate: if there's a new RH message and we're sending
    if (newMessageFrom && !showDuplicateWarning) {
      setPendingContent(content);
      setShowDuplicateWarning(true);
      return false;
    }

    try {
      await sendMessageMutation.mutateAsync(content);
      setLastSeenCount(prev => (prev !== null ? prev + 1 : null));
      setNewMessageFrom(null);
      setShowDuplicateWarning(false);
      setPendingContent(null);
      scrollToBottom();
      return true;
    } catch {
      return false;
    }
  }, [sendMessageMutation, newMessageFrom, showDuplicateWarning, scrollToBottom]);

  const handleConfirmSend = useCallback(async () => {
    if (!pendingContent) return;
    setShowDuplicateWarning(false);
    try {
      await sendMessageMutation.mutateAsync(pendingContent);
      setLastSeenCount(prev => (prev !== null ? prev + 1 : null));
      setNewMessageFrom(null);
      setPendingContent(null);
      scrollToBottom();
    } catch {}
  }, [pendingContent, sendMessageMutation, scrollToBottom]);

  const handleResolve = useCallback(async (): Promise<boolean> => {
    try {
      await resolveTicketMutation.mutateAsync();
      return true;
    } catch {
      return false;
    }
  }, [resolveTicketMutation]);

  const handleAssign = useCallback(async () => {
    if (!ticket) return;
    const action = ticket.assignedTo === null || ticket.assignedTo !== currentUserId ? 'assume' : 'release';
    try {
      await assignMutation.mutateAsync(action);
    } catch {}
  }, [ticket, currentUserId, assignMutation]);

  const dismissNewMessage = useCallback(() => {
    setLastSeenCount(ticket?.messages?.length ?? null);
    setNewMessageFrom(null);
    scrollToBottom();
  }, [ticket?.messages?.length, scrollToBottom]);

  if (isLoading) {
    return (
      <div className="page-content flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" aria-hidden="true" />
        <span className="sr-only">Carregando chamado...</span>
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="page-content text-center py-16">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" aria-hidden="true" />
        <p className="text-slate-600 font-medium mb-1">Chamado não encontrado</p>
        <p className="text-slate-400 text-sm mb-4">O chamado pode não existir ou você não tem permissão.</p>
        <Link to="/rh/chamados" className="text-brand-600 text-sm font-medium underline hover:text-brand-700">
          ← Voltar à fila de chamados
        </Link>
      </div>
    );
  }

  const isResolved = ticket.status === 'resolvido';
  const isAssignedToMe = ticket.assignedTo === currentUserId;
  const assignLabel = isAssignedToMe ? 'Liberar' : 'Assumir';
  const AssignIcon = isAssignedToMe ? UserX : UserCheck;

  return (
    <div className="page-content">
      {/* Back link */}
      <Link
        to="/rh/chamados"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-4 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
        Fila de chamados
      </Link>

      {/* Header */}
      <div className="mb-5">
        <div className="flex flex-wrap items-start gap-2 mb-1">
          <span className="text-xs font-mono text-slate-400">#{ticket.id}</span>
          <TicketStatusBadge status={ticket.status} />
          <CategoryChip category={ticket.category} />
        </div>
        <h1 className="text-lg font-bold text-slate-900 break-words">{ticket.subject}</h1>
        <p className="text-xs text-slate-500 mt-0.5">Aberto {formatFullDateTime(ticket.createdAt)}</p>
      </div>

      {/* Main 2-col layout */}
      <div className="flex flex-col lg:flex-row gap-5">

        {/* LEFT: conversation */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* New message banner */}
          {newMessageFrom && (
            <NewMessageBanner
              authorName={newMessageFrom}
              onScrollToBottom={dismissNewMessage}
            />
          )}

          {/* Messages */}
          <div
            ref={conversationRef}
            role="log"
            aria-live="polite"
            aria-label="Conversa do chamado"
            className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1 min-h-[300px] max-h-[60vh] overflow-y-auto"
          >
            {(ticket.messages ?? []).length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-8">Nenhuma mensagem ainda.</p>
            ) : (
              ticket.messages!.map(msg => (
                <MessageBubble key={msg.id} message={msg} viewerRole="rh" />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Duplicate warning dialog */}
          <ConfirmDialog
            isOpen={showDuplicateWarning}
            title="Resposta possivelmente duplicada"
            description={`${newMessageFrom} respondeu enquanto você digitava. Deseja enviar mesmo assim?`}
            confirmLabel="Enviar mesmo assim"
            cancelLabel="Cancelar"
            variant="danger"
            onConfirm={handleConfirmSend}
            onCancel={() => { setShowDuplicateWarning(false); setPendingContent(null); }}
          />

          {/* Reply box */}
          {!isResolved && (
            <ReplyBox
              onSendMessage={handleSendMessage}
              disabled={sendMessageMutation.isPending}
              placeholder="Escreva sua resposta ao colaborador..."
            />
          )}
          {isResolved && (
            <div className="text-xs text-slate-500 text-center py-3 bg-slate-50 border border-slate-200 rounded-xl">
              Chamado resolvido — sem novas respostas.
            </div>
          )}
        </div>

        {/* RIGHT: sidebar */}
        <div className="lg:w-72 xl:w-80 flex flex-col gap-4 shrink-0">
          {/* Requester card */}
          {ticket.requester ? (
            <RequesterCard requester={ticket.requester} />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Colaborador</h3>
              <p className="text-sm font-medium text-slate-800">{ticket.requesterName || '—'}</p>
              {ticket.requesterDepartment && (
                <p className="text-xs text-slate-500">{ticket.requesterDepartment}</p>
              )}
            </div>
          )}

          {/* Info card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Detalhes</h3>
            <dl className="space-y-2 text-xs">
              <div>
                <dt className="text-slate-500">Responsável</dt>
                <dd className="font-medium text-slate-800 mt-0.5">
                  {ticket.assignedToName || <span className="text-slate-400 italic">Sem responsável</span>}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Última atividade</dt>
                <dd className="font-medium text-slate-800 mt-0.5">
                  {formatRelativeTime(ticket.lastMessageAt || ticket.updatedAt)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Actions card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Ações</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAssign}
              isLoading={assignMutation.isPending}
              disabled={assignMutation.isPending}
              className={cn(
                'w-full gap-1.5 text-xs',
                isAssignedToMe
                  ? 'text-slate-600 border-slate-300 hover:bg-slate-50'
                  : 'text-brand-700 border-brand-300 hover:bg-brand-50'
              )}
            >
              <AssignIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {assignLabel} chamado
            </Button>

            {!isResolved && (
              <ResolveButton
                onResolve={handleResolve}
                isResolving={resolveTicketMutation.isPending}
              />
            )}
            {isResolved && ticket.resolvedAt && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-center">
                Resolvido {formatRelativeTime(ticket.resolvedAt)}
                {ticket.resolvedByName ? ` por ${ticket.resolvedByName}` : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
