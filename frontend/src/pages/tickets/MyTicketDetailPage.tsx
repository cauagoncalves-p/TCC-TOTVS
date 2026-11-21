import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Clock, AlertTriangle, Plus, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { TicketStatusBadge } from '../../features/tickets/components/TicketStatusBadge';
import { CategoryChip } from '../../features/tickets/components/CategoryChip';
import { MessageBubble } from '../../features/tickets/components/MessageBubble';
import { ReplyBox } from '../../features/tickets/components/ReplyBox';
import { ResolveButton } from '../../features/tickets/components/ResolveButton';
import { useTicket, useSendMessage, useResolveTicket } from '../../features/tickets/hooks';
import {
  formatFullDateTime,
  canReopenTicket,
  getReopenDaysRemaining
} from '../../features/tickets/utils/ticketUtils';
import { notificationStore } from '../../features/compliance/notifications';

export const MyTicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const successMessage = (location.state as any)?.successMessage;
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(successMessage || null);
  const [ariaLiveAnnouncement, setAriaLiveAnnouncement] = useState<string>('');

  const { data: ticket, isLoading, isError, error, refetch } = useTicket(id);
  const sendMessageMutation = useSendMessage(id || '');
  const resolveTicketMutation = useResolveTicket(id || '');

  // Marca notificação do chamado como lida ao abrir
  useEffect(() => {
    if (!id) return;
    const notifs = notificationStore.getNotifications();
    const match = notifs.find(
      (n: any) =>
        (n.refType === 'chamado' && String(n.refId) === String(id)) ||
        (n.id && n.id.includes(`chamado-${id}`))
    );
    if (match && !match.isRead) {
      notificationStore.markAsRead(match.id);
    }
  }, [id]);

  const handleSendMessage = async (content: string): Promise<boolean> => {
    try {
      await sendMessageMutation.mutateAsync(content);
      setAriaLiveAnnouncement('Mensagem enviada com sucesso');
      setTimeout(() => setAriaLiveAnnouncement(''), 3000);
      refetch();
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao enviar mensagem.';
      throw new Error(msg);
    }
  };

  const handleResolveTicket = async (): Promise<boolean> => {
    try {
      await resolveTicketMutation.mutateAsync();
      setAriaLiveAnnouncement('Chamado marcado como resolvido');
      setTimeout(() => setAriaLiveAnnouncement(''), 3000);
      refetch();
      return true;
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Não foi possível resolver o chamado.');
      return false;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 py-8" aria-busy="true">
        <div className="h-8 w-40 bg-slate-200/60 rounded-lg animate-pulse" />
        <div className="h-24 bg-slate-200/60 rounded-xl animate-pulse" />
        <div className="h-64 bg-slate-200/60 rounded-xl animate-pulse" />
      </div>
    );
  }

  // 404 Tratado conforme PARTE5E
  const is404 = (error as any)?.response?.status === 404 || (!isLoading && !ticket && !isError);
  if (is404) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-semibold text-slate-900">Chamado não encontrado</h2>
        <p className="text-xs text-slate-500">
          Este chamado não existe ou você não possui permissão para visualizá-lo.
        </p>
        <Button
          onClick={() => navigate('/chamados')}
          size="sm"
          className="text-xs font-semibold"
        >
          Voltar para Meus chamados
        </Button>
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <ErrorState
          title="Erro ao carregar detalhes do chamado"
          message={error?.message || 'Falha na comunicação com o servidor.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const isResolved = ticket.status === 'resolvido';
  const isReopenable = isResolved && canReopenTicket(ticket.resolvedAt);
  const reopenDaysRemaining = isResolved ? getReopenDaysRemaining(ticket.resolvedAt) : 0;
  const isExpired = isResolved && !isReopenable;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Região ao vivo para leitores de tela */}
      <div className="sr-only" aria-live="polite" role="status">
        {ariaLiveAnnouncement}
      </div>

      {/* Alerta de confirmação após abertura de novo chamado */}
      {feedbackNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{feedbackNotice}</span>
          </div>
          <button
            onClick={() => setFeedbackNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-medium px-2 py-0.5 rounded"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Navegação e Cabeçalho do Chamado */}
      <div className="space-y-3 pb-4 border-b border-slate-200">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/chamados')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Meus chamados</span>
          </button>

          {!isResolved && (
            <ResolveButton
              onResolve={handleResolveTicket}
              isResolving={resolveTicketMutation.isPending}
            />
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-sm font-bold text-slate-500">#{ticket.id}</span>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {ticket.subject}
              </h1>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
              <CategoryChip category={ticket.category} />
              <span className="flex items-center gap-1 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Aberto em {formatFullDateTime(ticket.createdAt)}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            <TicketStatusBadge status={ticket.status} role="colaborador" />
          </div>
        </div>
      </div>

      {/* Faixa Informativa se o chamado estiver Resolvido */}
      {isResolved && (
        <div
          className={`p-3.5 rounded-xl border text-xs ${
            isReopenable
              ? 'bg-amber-50/90 border-amber-200 text-amber-900'
              : 'bg-slate-100 border-slate-300 text-slate-700'
          }`}
          role="status"
        >
          <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">
                  Chamado resolvido em {formatFullDateTime(ticket.resolvedAt || ticket.updatedAt)}.
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  {isReopenable ? (
                    <>
                      Você ainda pode responder a esta conversa para reabrir o chamado (restam{' '}
                      <strong>{reopenDaysRemaining} {reopenDaysRemaining === 1 ? 'dia' : 'dias'}</strong> no prazo de tolerância de 7 dias).
                    </>
                  ) : (
                    <>
                      Este chamado foi resolvido há mais de 7 dias e foi arquivado. Caso ainda precise de suporte, abra um novo chamado.
                    </>
                  )}
                </p>
              </div>
            </div>

            {isExpired && (
              <Link to="/chamados/novo">
                <Button size="sm" className="gap-1.5 text-xs font-semibold shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo chamado</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Histórico da Conversa */}
      <div
        className="bg-slate-50/60 rounded-2xl p-4 sm:p-5 border border-slate-200/80 min-h-[220px]"
        role="log"
        aria-label="Histórico de mensagens do chamado"
        aria-live="polite"
      >
        {ticket.messages && ticket.messages.length > 0 ? (
          <div className="space-y-1">
            {ticket.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                viewerRole="colaborador"
              />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            Nenhuma mensagem registrada neste chamado.
          </div>
        )}
      </div>

      {/* Caixa de Resposta */}
      {!isExpired ? (
        <ReplyBox
          onSendMessage={handleSendMessage}
          disabled={sendMessageMutation.isPending}
          reopenWarning={
            isReopenable
              ? 'Responder esta mensagem reabrirá o chamado para atendimento do RH.'
              : null
          }
          placeholder="Escreva sua resposta para a equipe de Recursos Humanos..."
        />
      ) : (
        <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-center text-xs text-slate-500">
          Chamado encerrado definitivamente. Não é mais possível enviar mensagens nesta solicitação.
        </div>
      )}
    </div>
  );
};
