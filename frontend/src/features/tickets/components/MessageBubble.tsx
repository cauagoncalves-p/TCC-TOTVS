import React from 'react';
import { TicketMessage, TicketRole } from '../types';
import { formatRelativeTime, formatFullDateTime } from '../utils/ticketUtils';
import { cn } from '../../../lib/utils';
import { User, Users } from 'lucide-react';

interface MessageBubbleProps {
  message: TicketMessage;
  viewerRole?: TicketRole;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  viewerRole = 'colaborador'
}) => {
  const isColaborador = message.authorRole === 'colaborador';
  // For collaborator, collaborator messages are "Você", RH is "Equipe de RH".
  // Never expose RH email to collaborator.
  const authorLabel = viewerRole === 'colaborador'
    ? isColaborador
      ? 'Você'
      : 'Equipe de RH'
    : isColaborador
      ? message.authorName || 'Colaborador'
      : message.authorName || 'RH';

  const fullDate = formatFullDateTime(message.createdAt);
  const relativeTime = formatRelativeTime(message.createdAt);

  return (
    <div
      className={cn(
        'flex flex-col mb-4 max-w-[85%] sm:max-w-[75%]',
        isColaborador ? 'ml-auto items-end' : 'mr-auto items-start'
      )}
    >
      {/* Header com autor e timestamp */}
      <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-500 px-1">
        <span className="flex items-center gap-1 font-semibold text-slate-700">
          {isColaborador ? (
            <User className="w-3 h-3 text-brand-600 shrink-0" aria-hidden="true" />
          ) : (
            <Users className="w-3 h-3 text-indigo-600 shrink-0" aria-hidden="true" />
          )}
          {authorLabel}
        </span>
        <span>•</span>
        <time
          dateTime={message.createdAt}
          title={fullDate}
          className="cursor-help"
        >
          {relativeTime}
        </time>
      </div>

      {/* Conteúdo da mensagem - estritamente texto puro */}
      <div
        className={cn(
          'p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words border shadow-2xs',
          isColaborador
            ? 'bg-brand-500 text-white border-brand-600 rounded-tr-xs'
            : 'bg-white text-slate-800 border-slate-200 rounded-tl-xs'
        )}
      >
        {message.content}
      </div>

      {/* Acessibilidade de data para leitores de tela */}
      <span className="sr-only">Enviado em {fullDate}</span>
    </div>
  );
};
