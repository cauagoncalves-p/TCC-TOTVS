import React from 'react';
import { RefreshCw, MessageSquarePlus, Bot } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ChatPanel } from '../../components/ui/ChatPanel';
import { DisclaimerBanner } from '../../components/ui/DisclaimerBanner';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useChat } from '../../features/chat/hooks';

const CHAT_SUGGESTIONS = [
  'Quantos dias de férias tenho?',
  'Por que veio desconto de vale-transporte?',
  'Qual é o meu salário base atual e cargo cadastrado?',
  'Como funciona o adiantamento salarial da TOTVS?',
];

export const ChatPage: React.FC = () => {
  const {
    sessionId,
    messages,
    isTyping,
    isLoadingHistory,
    errorMessage,
    clearError,
    sendMessage,
    startNewSession,
  } = useChat();

  return (
    <div
      className="flex flex-col max-w-5xl mx-auto min-h-0"
      style={{ height: 'calc(100dvh - var(--topbar-height) - 2 * var(--page-gutter))' }}
    >
      {/* Header com Ações visível a partir de sm */}
      <div className="hidden sm:block">
        <PageHeader
          title="Assistente de RH"
          subtitle="Consulte saldo de férias, esclareça dúvidas sobre holerite e benefícios corporativos"
          action={
            sessionId ? (
              <Button
                variant="outline"
                size="sm"
                onClick={startNewSession}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <MessageSquarePlus className="w-4 h-4 text-primary" />
                Nova Conversa
              </Button>
            ) : undefined
          }
        />

        {/* Banner Informativo Desktop */}
        <div className="mb-3">
          <DisclaimerBanner
            type="assistant"
            message="Este assistente consulta diretamente seus dados funcionais e a base interna de benefícios. Informações oficiais sujeitas às políticas de RH e CCT vigente."
          />
        </div>
      </div>

      {/* Área Principal do Chat (ocupa toda a altura útil no mobile) */}
      <div className="flex-1 min-h-0 flex flex-col">
        {isLoadingHistory ? (
          <div className="h-full bg-card rounded-xl border border-border p-4 sm:p-6 space-y-4">
            <div className="flex items-center space-x-3 mb-4">
              <Skeleton className="w-9 h-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="w-40 h-4" />
                <Skeleton className="w-28 h-3" />
              </div>
            </div>
            <Skeleton className="w-3/4 h-14 rounded-2xl ml-auto" />
            <Skeleton className="w-2/3 h-20 rounded-2xl" />
            <Skeleton className="w-1/2 h-14 rounded-2xl ml-auto" />
          </div>
        ) : (
          <ChatPanel
            messages={messages}
            isTyping={isTyping}
            onSendMessage={sendMessage}
            suggestions={CHAT_SUGGESTIONS}
            errorMessage={errorMessage}
            onClearError={clearError}
            title="Assistente de RH"
            subtitle="Férias, holerite e benefícios"
            action={
              sessionId ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startNewSession}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 sm:hidden h-8"
                  title="Iniciar nova conversa"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5 text-primary" />
                  <span>Nova</span>
                </Button>
              ) : undefined
            }
          />
        )}
      </div>
    </div>
  );
};

export default ChatPage;
